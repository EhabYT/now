const { Events, EmbedBuilder } = require('discord.js');
const { hasModPerms } = require('../utils/helpers');
const config = require('../utils/config');
const logger = require('../utils/logger');
const { getCached, setCached } = require('../utils/db');
const emojis = require('../utils/emojis');

// These would normally be in a separate file or handled by a more robust anti-spam system
const spamTracker = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;
        const db = client.db;

        // Stats & XP (using cache for speed)
        const sK = `stats_${message.guild.id}_${message.author.id}`;
        const s = await getCached(sK) || { messages: 0, voiceTime: 0, reactions: 0 };
        s.messages++;
        await setCached(sK, s);

        // XP System (Respect Global Toggle & Phase 18 Advanced Controls)
        const xpEnabled = await getCached(`xp_enabled_${message.guild.id}`) !== false;
        if (xpEnabled) {
            // Check Excluded Channels
            const ignoredChannels = await getCached(`xp_ignored_channels_${message.guild.id}`) || [];
            if (!ignoredChannels.includes(message.channel.id)) {
                const xK = `xp_${message.guild.id}_${message.author.id}`;
                const xD = await getCached(xK) || { textXp: 0, textLevel: 1, voiceXp: 0, voiceLevel: 1 };

                // Apply Multiplier
                const multiplier = await getCached(`xp_multiplier_${message.guild.id}`) || 1.0;
                const baseXP = Math.floor(Math.random() * 10) + 5;
                xD.textXp += Math.floor(baseXP * multiplier);

                if (xD.textXp >= xD.textLevel * 100) {
                    xD.textXp -= xD.textLevel * 100;
                    xD.textLevel++;

                    // Phase 4: Level Role Rewards
                    const rewards = await getCached(`rewards_${message.guild.id}`) || [];
                    const reward = rewards.find(r => r.level === xD.textLevel);
                    if (reward) {
                        try {
                            const role = message.guild.roles.cache.get(reward.roleId);
                            if (role) await message.member.roles.add(role);
                        } catch (e) { logger.warn('Level role assignment failed', { error: e.message, userId: message.author.id }); }
                    }
                }
                await setCached(xK, xD);
            }
        }

        // Music Setup channel interaction
        // ... (remaining music setup logic) ...

        // AutoMod
        const autoModCfg = await getCached(`automod_${message.guild.id}`) || {};
        if (Object.keys(autoModCfg).length === 0 || hasModPerms(message.member)) return;

        const wl = await getCached(`automod_whitelist_${message.guild.id}`) || { users: [], roles: [], channels: [] };
        if (wl.users.includes(message.author.id) ||
            wl.channels.includes(message.channel.id) ||
            message.member?.roles.cache.some(r => wl.roles.includes(r.id))) return;

        let violation = null;
        let violationType = null;

        // 1. Anti-Spam
        if (autoModCfg.antiSpam) {
            const k = `${message.guild.id}_${message.author.id}`;
            const now = Date.now();
            const msgTimes = spamTracker.get(k) || [];
            msgTimes.push(now);
            const recent = msgTimes.filter(t => now - t < 5000);
            spamTracker.set(k, recent);
            if (recent.length > 5) { // Default threshold
                violation = `Spam (${recent.length} in 5s)`;
                violationType = 'spam';
            }
        }

        // 2. Bad Words
        if (!violation && autoModCfg.badWords) {
            if (config.profanity?.length && config.profanity.some(word => message.content.toLowerCase().includes(word))) {
                violation = 'Profanity';
                violationType = 'profanity';
            }
        }

        // 3. Anti-Links
        if (!violation && autoModCfg.antiLinks) {
            const links = message.content.match(/https?:\/\/[^\s]+/gi) || [];
            if (links.length > 3) {
                violation = `Links (${links.length})`;
                violationType = 'links';
            }
        }

        // 4. Caps Control
        const caps = autoModCfg.caps;
        if (!violation && caps?.enabled && message.content.length > 10) {
            const capsCount = message.content.replace(/[^A-Z]/g, '').length;
            const threshold = caps.threshold || 70;
            if (capsCount / message.content.length > threshold / 100) {
                violation = 'CAPS';
                violationType = 'caps';
            }
        }

        // 5. Emoji Spam
        const emojisCfg = autoModCfg.emojis;
        if (!violation && emojisCfg?.enabled) {
            const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|<a?:\w+:\d+>)/gu;
            const emojis = message.content.match(emojiRegex) || [];
            const threshold = emojisCfg.threshold || 10;
            if (emojis.length > threshold) {
                violation = `Emojis (${emojis.length})`;
                violationType = 'emojis';
            }
        }

        // 6. Mention Spam
        const mentionsCfg = autoModCfg.mentions;
        if (!violation && mentionsCfg?.enabled) {
            const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
            const threshold = mentionsCfg.threshold || 5;
            if (message.mentions.everyone || mentionsCount > threshold) {
                violation = 'Mentions';
                violationType = 'mentions';
            }
        }

        // 7. Custom Filters (Phase 4)
        if (!violation) {
            const customFilters = await getCached(`custom_filters_${message.guild.id}`) || [];
            const lowContent = message.content.toLowerCase();
            for (const pattern of customFilters) {
                if (lowContent.includes(pattern.toLowerCase())) {
                    violation = `Custom Filter (${pattern})`;
                    violationType = 'custom';
                    break;
                }
            }
        }

        if (violation) {
            try {
                await message.delete();
                const vK = `automod_violations_${message.guild.id}_${message.author.id}`;
                let vcount = (await db.get(vK)) || 0;
                vcount++;
                await db.set(vK, vcount);

                const embed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle(`${emojis.shield} AutoMod Warning`)
                    .setDescription(`${message.author}, your message was removed.\n**Reason:** ${violation}`)
                    .setFooter({ text: `Violations: ${vcount}/3` })
                    .setTimestamp();

                const warnMsg =                 await message.channel.send({ embeds: [embed] }).catch(() => {});
                setTimeout(() => warnMsg.delete().catch(() => { }), 10000);

                if (vcount >= 3 && message.member) {
                    try {
                        await message.member.timeout(10 * 60 * 1000, 'AutoMod violations');
                        await db.set(vK, 0);
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle(`${emojis.shield} AutoMod Timeout`)
                            .setDescription(`${message.author} timed out (10m) for 3 violations.`)
                            .setTimestamp();
                        const timeoutMsg = await message.channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
                        setTimeout(() => timeoutMsg.delete().catch(() => { }), 30000);
                    } catch (e) {
                        logger.warn('AutoMod timeout failed', { error: e.message, userId: message.author.id });
                    }
                }
                logger.automod(violationType, message.author, message.guild, { viol: violation, vcount: vcount });
            } catch (e) {
                logger.warn('AutoMod violation handling error', { error: e.message, userId: message.author.id });
            }
            return; // Don't process responders if violation occurred
        }

        // 8. Auto-Responder System (Phase 18)
        try {
            const responders = await getCached(`autoresponder_${message.guild.id}`) || [];
            if (responders.length > 0) {
                const content = message.content.toLowerCase();
                for (const r of responders) {
                    // Simple keyword match or basic regex if we want to be fancy later
                    if (content.includes(r.trigger.toLowerCase())) {
                        await message.reply(r.response).catch(() => {});
                        break; // Only one response per message to avoid spam
                    }
                }
            }
        } catch (e) {
            logger.error('AutoResponder error', { error: e.message });
        }
    },
    cleanup() {
        const now = Date.now();
        for (const [key, times] of spamTracker.entries()) {
            const recent = times.filter(t => now - t < 5000);
            if (recent.length === 0) {
                spamTracker.delete(key);
            } else {
                spamTracker.set(key, recent);
            }
        }
    }
};

