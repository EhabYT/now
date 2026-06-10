const express = require('express');
const router = express.Router({ mergeParams: true });
const { db, getGuildData, invalidateGuildData, getUserData, invalidateUserCache, clearUserCache, getAllCached, invalidateAllCache } = require('../../utils/db');
const { EmbedBuilder, WebhookClient, PermissionsBitField, PermissionFlagsBits, ChannelType } = require('discord.js');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');
const isDev = process.env.NODE_ENV !== 'production';

module.exports = (botClient) => {
    // ── Middleware: Validate Guild Access & Auth ──
    async function validateGuild(req, res, next) {
        const { guildId } = req.params;
        if (!botClient) return res.status(503).json({ error: 'Bot is initializing' });

        if (!req.session?.user?.id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userGuilds = req.session?.userGuilds || [];
        const memberGuild = userGuilds.find(g => g.id === guildId);
        if (!memberGuild) {
            return res.status(403).json({ error: 'Not a member of this server' });
        }

        const perms = BigInt(memberGuild.permissions || 0);
        const hasAdmin = (perms & 0x8n) === 0x8n;
        const hasManageGuild = (perms & 0x20n) === 0x20n;
        if (!hasAdmin && !hasManageGuild) {
            return res.status(403).json({ error: 'Missing Manage Server permission' });
        }

        const guild = botClient.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Server not found' });

        req.guild = guild;
        next();
    }

    // Apply validation to all routes in this router
    router.use(validateGuild);

    router.get('/', async (req, res) => {
        try {
            const { guildId } = req.params;
            const guild = req.guild;

            const cfg = await getGuildData(guildId);
            const { automod, welcome, logging, djrole, xp_enabled: xpEnabled, giveaways, commands_enabled: commandsEnabled, tickets, rewards, custom_filters: customFilters, autoresponder } = cfg;

            const activeGiveaways = (giveaways || []).filter(g => g.active).length;

            const diagnostics = { status: 'Healthy', missingPermissions: [] };
            const botMember = guild.members.me;
            const required = [
                { bit: PermissionsBitField.Flags.ManageChannels, name: 'Manage Channels', feature: 'Slowmode/Lock' },
                { bit: PermissionsBitField.Flags.ModerateMembers, name: 'Moderate Members', feature: 'Timeout' },
                { bit: PermissionsBitField.Flags.BanMembers, name: 'Ban Members', feature: 'Ban' },
                { bit: PermissionsBitField.Flags.KickMembers, name: 'Kick Members', feature: 'Kick' },
                { bit: PermissionsBitField.Flags.ManageMessages, name: 'Manage Messages', feature: 'AutoMod/Cleanup' },
                { bit: PermissionsBitField.Flags.EmbedLinks, name: 'Embed Links', feature: 'Rich Messages' },
                { bit: PermissionsBitField.Flags.SendMessages, name: 'Send Messages', feature: 'Core Response' }
            ];

            required.forEach(p => {
                if (!botMember.permissions.has(p.bit)) {
                    diagnostics.missingPermissions.push({ name: p.name, feature: p.feature });
                }
            });

            if (diagnostics.missingPermissions.length > 0) {
                diagnostics.status = diagnostics.missingPermissions.length > 3 ? 'Critical' : 'Limited';
            }

            res.json({
                guild: {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL({ size: 128 }),
                    memberCount: guild.memberCount,
                    xpEnabled: xpEnabled !== false,
                    channels: guild.channels.cache
                        .filter(c => [ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum].includes(c.type))
                        .map(c => ({ id: c.id, name: c.name, type: c.type })),
                    roles: guild.roles.cache
                        .filter(r => r.name !== '@everyone' && !r.managed)
                        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
                },
                diagnostics,
                automod: automod || {},
                welcome: welcome || { enabled: false, message: '', channelId: null, autoRoleId: null },
                logging: logging || {},
                djrole,
                activeGiveaways,
                tickets: tickets ? { ...tickets, categoryId: tickets.categoryId || tickets.category || null, logChannel: tickets.logChannel || null } : { categoryId: null, logChannel: null },
                commandsEnabled: commandsEnabled || {},
                rewards: rewards || [],
                customFilters: customFilters || [],
                autoresponder: autoresponder || []
            });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/leaderboard', async (req, res) => {
        try {
            const { guildId } = req.params;
            const type = req.query.type || 'xp';
            const all = await getAllCached();

            let entries = [];
            const filterPrefix = type === 'xp' ? `xp_${guildId}_` : `stats_${guildId}_`;

            entries = all
                .filter(e => e.id.startsWith(filterPrefix))
                .map(e => ({ userId: e.id.replace(filterPrefix, ''), ...e.value }));

            if (type === 'xp') {
                entries.sort((a, b) => (b.textLevel * 100 + b.textXp) - (a.textLevel * 100 + a.textXp));
            } else if (type === 'messages') {
                entries.sort((a, b) => b.messages - a.messages);
            } else if (type === 'voice') {
                entries.sort((a, b) => b.voiceTime - a.voiceTime);
            }

            entries = entries.slice(0, 15);

            await Promise.all(entries.map(async entry => {
                const user = await botClient.users.fetch(entry.userId).catch(() => null);
                entry.username = user ? user.username : entry.userId;
                entry.avatar = user ? user.displayAvatarURL({ size: 32 }) : null;
            }));

            res.json(entries);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/warnings', async (req, res) => {
        try {
            const { guildId } = req.params;
            const allKeys = await getAllCached();
            const warnings = allKeys
                .filter(e => e.id.startsWith(`warnings_${guildId}_`))
                .flatMap(e => (e.value || []).map(w => ({
                    userId: e.id.replace(`warnings_${guildId}_`, ''),
                    ...w
                })));
            res.json(warnings);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/activity', async (req, res) => {
        try {
            const { guildId } = req.params;
            const guild = req.guild;

            const [audit, allKeys] = await Promise.all([
                guild.fetchAuditLogs({ limit: 10 }).catch(() => ({ entries: [] })),
                getAllCached()
            ]);

            const activities = audit.entries.map(e => ({
                type: 'audit',
                action: e.action,
                executor: { id: e.executorId, tag: botClient.users.cache.get(e.executorId)?.username || 'Unknown' },
                target: e.target ? { id: e.target.id, tag: e.target.username || e.target.name || 'Unknown' } : null,
                timestamp: e.createdTimestamp,
                description: `Audit Log entry: ${e.action}`
            }));

            const warnings = allKeys
                .filter(e => e.id.startsWith(`warnings_${guildId}_`))
                .flatMap(e => (e.value || []).map(w => ({
                    type: 'warning',
                    userId: e.id.replace(`warnings_${guildId}_`, ''),
                    reason: w.reason,
                    moderator: w.moderator,
                    timestamp: w.timestamp || Date.now()
                })));

            const combined = [...activities, ...warnings]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 20);

            res.json(combined);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/automod', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { setting, value, threshold } = req.body;
            const validSettings = ['antiSpam', 'antiLinks', 'badWords', 'caps', 'emojis', 'mentions'];
            if (!validSettings.includes(setting)) return res.status(400).json({ error: 'Invalid setting' });

            const data = await getGuildData(guildId);
            const automod = data.automod || {};
            if (['antiSpam', 'antiLinks', 'badWords'].includes(setting)) {
                automod[setting] = !!value;
            } else {
                if (!automod[setting]) automod[setting] = { enabled: false, threshold: 5 };
                if (typeof value !== 'undefined') automod[setting].enabled = !!value;
                if (typeof threshold !== 'undefined') automod[setting].threshold = parseInt(threshold);
            }
            data.automod = automod;
            db.set(`automod_${guildId}`, automod).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json({ automod });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/welcome', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { enabled, message, channelId, autoRoleId, embed } = req.body;
            const data = await getGuildData(guildId);
            const config = data.welcome || { enabled: false, message: '', channelId: null, autoRoleId: null, embed: null };
            if (typeof enabled !== 'undefined') config.enabled = !!enabled;
            if (typeof message !== 'undefined') config.message = message;
            if (typeof channelId !== 'undefined') config.channelId = channelId;
            if (typeof autoRoleId !== 'undefined') config.autoRoleId = autoRoleId;
            if (typeof embed !== 'undefined') config.embed = embed;
            data.welcome = config;
            db.set(`welcome_${guildId}`, config).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(config);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/verification', async (req, res) => {
        try {
            const data = await getGuildData(req.params.guildId);
            const config = data.verification || { enabled: false, roleId: null };
            res.json(config);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/verification', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { enabled, roleId, logChannelId } = req.body;
            const data = await getGuildData(guildId);
            const config = data.verification || { enabled: false, roleId: null, logChannelId: null };
            if (typeof enabled !== 'undefined') config.enabled = !!enabled;
            if (typeof roleId !== 'undefined') config.roleId = roleId;
            if (typeof logChannelId !== 'undefined') config.logChannelId = logChannelId;
            data.verification = config;
            db.set(`verification_${guildId}`, config).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(config);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    // GET /tickets — list open tickets
    router.get('/tickets', async (req, res) => {
        try {
            const { guildId } = req.params;
            const data = await getGuildData(guildId);
            const opentickets = data.opentickets || {};
            const tickets = Object.entries(opentickets).map(([userId, channelId]) => ({ userId, channelId }));
            res.json(tickets);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/logging', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { type, channelId } = req.body;
            const validTypes = ['messages', 'msg_delete', 'bulk_delete', 'members', 'moderation', 'channels', 'voice', 'invites', 'mute_def', 'server_update', 'unban', 'role_update', 'member_leave', 'move', 'kick', 'role_delete', 'channel_delete', 'ban', 'threads'];
            if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid log type' });

            const data = await getGuildData(guildId);
            const logging = data.logging || {};
            logging[type] = channelId || null;
            data.logging = logging;
            db.set(`logging_${guildId}`, logging).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(logging);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/config', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { xpEnabled } = req.body;
            if (typeof xpEnabled !== 'undefined') {
                const data = await getGuildData(guildId);
                data.xp_enabled = !!xpEnabled;
                db.set(`xp_enabled_${guildId}`, data.xp_enabled).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/locale', async (req, res) => {
        try {
            const data = await getGuildData(req.params.guildId);
            res.json({ locale: data.locale || null });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/locale', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { locale } = req.body;
            const valid = ['en', 'ar', 'de'];
            if (!valid.includes(locale)) return res.status(400).json({ error: 'Invalid locale. Use: en, ar, de' });
            const data = await getGuildData(guildId);
            data.locale = locale;
            db.set(`locale_${guildId}`, locale).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json({ locale });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/giveaways', async (req, res) => {
        try {
            const data = await getGuildData(req.params.guildId);
            const giveaways = (data.giveaways || []).filter(g => g.active);
            res.json(giveaways.map(g => ({ ...g, id: g.messageId })));
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/giveaways/create', async (req, res) => {
        try {
            const { prize, duration, winners, channelId } = req.body;
            const guild = req.guild;
            const channel = guild.channels.cache.get(channelId);
            if (!channel) return res.status(404).json({ error: 'Channel not found' });

            const endsAt = Date.now() + duration;
            const embed = new EmbedBuilder()
                .setTitle(`${emojis.party} GIVEAWAY ${emojis.party}`)
                .setDescription(`**Prize**: ${prize}\n**Ends**: <t:${Math.round(endsAt / 1000)}:R>\n**Winners**: ${winners}\nReact with ${emojis.party} to enter!`)
                .setColor('#FF0000').setTimestamp(endsAt);

            const msg = await channel.send({ embeds: [embed] });
            await msg.react(emojis.party);

            const giveaway = { messageId: msg.id, channelId: channel.id, guildId: guild.id, prize, winners: parseInt(winners), endsAt, active: true, hostId: 'Dashboard' };
            const data = await getGuildData(guild.id);
            const giveaways = data.giveaways || [];
            giveaways.push(giveaway);
            data.giveaways = giveaways;
            db.set(`giveaways_${guild.id}`, giveaways).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/giveaways/:id/end', async (req, res) => {
        try {
            const { guildId, id } = req.params;
            const data = await getGuildData(guildId);
            const giveaways = data.giveaways || [];
            const giveaway = giveaways.find(g => g.messageId === id && g.active);
            if (giveaway) {
                giveaway.active = false;
                giveaway.endsAt = Date.now();
                data.giveaways = giveaways;
                db.set(`giveaways_${guildId}`, giveaways).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/giveaways/:id/reroll', async (req, res) => {
        try {
            const { id } = req.params;
            const giveaways = await db.get(`giveaways_${req.params.guildId}`) || [];
            const giveaway = giveaways.find(g => g.messageId === id);
            if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });

            const channel = req.guild.channels.cache.get(giveaway.channelId);
            if (channel) {
                const msg = await channel.messages.fetch(id).catch(() => null);
                if (msg) {
                    const emojiStr = '' + emojis.party + '';
                    const emojiName = emojiStr.match(/^<a?:(\w+):\d+>$/)?.[1] || emojiStr;
                    const reaction = msg.reactions.cache.find(r => r.emoji.name === emojiName);
                    if (reaction) {
                        const users = await reaction.users.fetch();
                        const winner = users.filter(u => !u.bot).random();
                        if (winner) await channel.send(`${emojis.party} New Winner: ${winner}! Prize: **${giveaway.prize}**`);
                        else await channel.send('No valid entries for reroll.');
                    }
                }
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/members', async (req, res) => {
        try {
            const query = (req.query.q || '').toLowerCase();
            let members = await req.guild.members.fetch();
            if (query) {
                members = members.filter(m => m.user.username.toLowerCase().includes(query) || (m.nickname && m.nickname.toLowerCase().includes(query)) || m.id.includes(query));
            }
            const data = members.first(50).map(m => ({ id: m.id, username: m.user.username, displayName: m.displayName, avatar: m.user.displayAvatarURL({ size: 64 }), joinedAt: m.joinedAt, roles: m.roles.cache.size - 1, isStaff: m.permissions.has(PermissionFlagsBits.ManageMessages) }));
            res.json(data);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/members/:userId/action', async (req, res) => {
        try {
            const { userId } = req.params;
            const { action, reason, duration } = req.body;
            const member = await req.guild.members.fetch(userId);
            if (!member) return res.status(404).json({ error: 'Member not found' });

            if (action === 'kick') await member.kick(reason || 'Dashboard Action');
            else if (action === 'ban') await member.ban({ reason: reason || 'Dashboard Action' });
            else if (action === 'timeout') await member.timeout(duration || 60000, reason || 'Dashboard Action');
            else if (action === 'warn') {
                const guildId = req.params.guildId;
                const userData = await getUserData(guildId, userId);
                const warnings = userData.warnings || [];
                warnings.push({ reason: reason || 'Dashboard Action', moderator: 'Dashboard', timestamp: Date.now() });
                userData.warnings = warnings;
                invalidateUserCache(guildId, userId);
                db.set(`warnings_${guildId}_${userId}`, warnings).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/members/:userId/roles', async (req, res) => {
        try {
            const { userId } = req.params;
            const { roles } = req.body;
            const member = await req.guild.members.fetch(userId);
            if (!member) return res.status(404).json({ error: 'Member not found' });
            await member.roles.set(roles);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/rewards', async (req, res) => {
        try {
            const data = await getGuildData(req.params.guildId);
            res.json(data.rewards || []);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/rewards', async (req, res) => {
        try {
            const { level, roleId } = req.body;
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            const rewards = data.rewards || [];
            rewards.push({ level: parseInt(level), roleId });
            data.rewards = rewards;
            db.set(`rewards_${guildId}`, rewards).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(rewards);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/rewards/delete', async (req, res) => {
        try {
            const { level, roleId } = req.body;
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            let rewards = data.rewards || [];
            rewards = rewards.filter(r => !(r.level === level && r.roleId === roleId));
            data.rewards = rewards;
            db.set(`rewards_${guildId}`, rewards).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(rewards);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/nickname', async (req, res) => {
        try {
            await req.guild.members.me.setNickname(req.body.nickname);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/automod/custom', async (req, res) => {
        try {
            const { pattern } = req.body;
            if (!pattern) return res.status(400).json({ error: 'Missing pattern' });
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            const filters = data.custom_filters || [];
            if (!filters.includes(pattern)) {
                filters.push(pattern);
                data.custom_filters = filters;
                db.set(`custom_filters_${guildId}`, filters).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            }
            res.json(filters);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/automod/custom/delete', async (req, res) => {
        try {
            const { pattern } = req.body;
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            let filters = data.custom_filters || [];
            filters = filters.filter(f => f !== pattern);
            data.custom_filters = filters;
            db.set(`custom_filters_${guildId}`, filters).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(filters);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/tickets', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { categoryId, logChannel, transcriptChannelId } = req.body;
            const data = await getGuildData(guildId);
            const config = data.tickets || { categoryId: null, logChannel: null };
            if (categoryId !== undefined) config.categoryId = categoryId;
            const ch = logChannel !== undefined ? logChannel : transcriptChannelId;
            if (ch !== undefined) config.logChannel = ch;
            data.tickets = config;
            db.set(`tickets_${guildId}`, config).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(config);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/embed', async (req, res) => {
        try {
            const { channelId, title, description, color, author, footer, image, thumbnail, fields } = req.body;
            const channel = req.guild.channels.cache.get(channelId);
            if (!channel) return res.status(404).json({ error: 'Channel not found' });

            const embed = new EmbedBuilder().setColor(color || '#00fbff');
            if (title) embed.setTitle(title);
            if (description) embed.setDescription(description);
            if (author?.name) embed.setAuthor({ name: author.name, iconURL: author.iconURL || null });
            if (footer?.text) embed.setFooter({ text: footer.text, iconURL: footer.iconURL || null });
            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);
            if (fields?.length) embed.addFields(fields.map(f => ({ name: f.name || 'Field', value: f.value || '...', inline: !!f.inline })));

            await channel.send({ embeds: [embed] });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    // ── Security Config (Anti-Raid / Anti-Spam) ──
    router.get('/security', async (req, res) => {
        try {
            const data = await getGuildData(req.params.guildId);
            res.json(data.security || {});
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/security', async (req, res) => {
        try {
            const { guildId } = req.params;
            const { antiRaid, antiSpam } = req.body;
            const data = await getGuildData(guildId);
            const config = data.security || {};
            if (antiRaid) config.antiRaid = { ...config.antiRaid, ...antiRaid };
            if (antiSpam) config.antiSpam = { ...config.antiSpam, ...antiSpam };
            data.security = config;
            db.set(`security_${guildId}`, config).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(config);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/commands/toggle', async (req, res) => {
        try {
            const { commandName, enabled } = req.body;
            if (!commandName) return res.status(400).json({ error: 'Missing command name' });
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            const current = data.commands_enabled || {};
            current[commandName] = !!enabled;
            data.commands_enabled = current;
            db.set(`commands_enabled_${guildId}`, current).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json(current);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/test-welcome', async (req, res) => {
        try {
            const welcomeCfg = await db.get(`welcome_${req.params.guildId}`);
            if (!welcomeCfg?.channelId) return res.status(400).json({ error: 'Welcome channel not configured' });
            const channel = await req.guild.channels.fetch(welcomeCfg.channelId).catch(() => null);
            if (!channel) return res.status(400).json({ error: 'Welcome channel not found' });
            await channel.send('Test welcome message! Welcome channel is working.');
            res.json({ success: true, message: 'Test message sent' });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/backup', async (req, res) => {
        try {
            const { guildId } = req.params;
            const data = await getGuildData(guildId);
            const backup = {};
            for (const key of Object.keys(data)) {
                backup[`${key}_${guildId}`] = data[key];
            }
            res.json(backup);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/restore', async (req, res) => {
        try {
            const backup = req.body;
            if (!backup || typeof backup !== 'object') return res.status(400).json({ error: 'Invalid backup data' });
            for (const [key, value] of Object.entries(backup)) {
                if (key.endsWith(`_${req.params.guildId}`)) await db.set(key, value);
            }
            invalidateGuildData(req.params.guildId);
            invalidateAllCache();
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/leave', async (req, res) => {
        try {
            await req.guild.leave();
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/autoresponder', async (req, res) => {
        try {
            const { trigger, response } = req.body;
            if (!trigger || !response) return res.status(400).json({ error: 'Trigger and response required' });
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            const responders = data.autoresponder || [];
            if (responders.length >= 100) return res.status(400).json({ error: 'Max 100 autoresponders' });
            responders.push({ trigger, response, id: Date.now().toString() });
            data.autoresponder = responders;
            db.set(`autoresponder_${guildId}`, responders).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json({ success: true, responders });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.delete('/autoresponder/:id', async (req, res) => {
        try {
            const { guildId, id } = req.params;
            const data = await getGuildData(guildId);
            let responders = data.autoresponder || [];
            responders = responders.filter(r => r.id !== id);
            data.autoresponder = responders;
            db.set(`autoresponder_${guildId}`, responders).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            res.json({ success: true, responders });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/xp/details', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const data = await getGuildData(guildId);
            const multiplier = data.xp_multiplier || 1.0;
            const ignoredChannels = data.xp_ignored_channels || [];
            const availableChannels = req.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name }));
            res.json({ multiplier, ignoredChannels, availableChannels });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/xp/advanced', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { multiplier, ignoredChannels } = req.body;
            db.set(`xp_multiplier_${guildId}`, parseFloat(multiplier) || 1.0).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            db.set(`xp_ignored_channels_${guildId}`, ignoredChannels || []).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            invalidateGuildData(guildId);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/webhook-logs', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'URL required' });
            if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url)) return res.status(400).json({ error: 'Invalid Discord webhook URL' });
            const data = await getGuildData(guildId);
            data.webhook_logs = url;
            db.set(`webhook_logs_${guildId}`, url).catch((_dbErr) => logger.debug('db.set error', { error: _dbErr }));
            sendToWebhook(guildId, { title: `${emojis.satellite} Log Bridge Established`, description: 'The dashboard audit bridge has been successfully established.\n**Executor:** System', color: 0x00fbff });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    async function sendToWebhook(guildId, embedData) {
        try {
            const url = await db.get(`webhook_logs_${guildId}`);
            if (!url) return;
            const webhook = new WebhookClient({ url });
            const embed = new EmbedBuilder(embedData).setTimestamp().setFooter({ text: 'EB Bot Audit Log' });
            await webhook.send({ embeds: [embed] });
        } catch (err) { logger.error('Webhook fail', { error: isDev ? err.message : 'Internal server error' }); }
    }

    // ── User Profile (for modal) ──
    router.get('/user/:userId', async (req, res) => {
        try {
            const { guildId, userId } = req.params;
            const member = await req.guild.members.fetch(userId).catch(() => null);
            if (!member) return res.status(404).json({ error: 'Member not found' });

            const userData = await getUserData(guildId, userId);
            const xp = userData.xp;
            const stats = userData.stats;
            const warnings = userData.warnings.length;

            res.json({
                id: member.id,
                username: member.user.username,
                displayName: member.displayName,
                tag: member.user.username,
                avatar: member.user.displayAvatarURL({ size: 128 }),
                joinedAt: member.joinedAt,
                roles: member.roles.cache
                    .filter(r => r.name !== '@everyone')
                    .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
                xp,
                stats,
                warnings
            });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    // ── Growth Chart Data ──
    router.get('/growth', async (req, res) => {
        try {
            const guild = req.guild;
            const now = Date.now();
            const labels = [];
            const data = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date(now - i * 86400000);
                labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
                // Approximate: use current member count with slight variation for demo
                const variation = Math.floor(Math.random() * 5) - 2;
                data.push(Math.max(0, guild.memberCount + variation - (i * 2)));
            }

            res.json({ labels, data });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    // ── XP Reset ──
    router.post('/xp/reset', async (req, res) => {
        try {
            const { guildId } = req.params;
            const allKeys = await getAllCached();
            const xpKeys = allKeys.filter(e => e.id.startsWith(`xp_${guildId}_`));
            const statsKeys = allKeys.filter(e => e.id.startsWith(`stats_${guildId}_`));

            await Promise.all([
                ...xpKeys.map(e => db.delete(e.id)),
                ...statsKeys.map(e => db.delete(e.id))
            ]);

            invalidateGuildData(guildId);
            invalidateAllCache();
            clearUserCache();
            res.json({ success: true, cleared: xpKeys.length + statsKeys.length });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    return router;
};
