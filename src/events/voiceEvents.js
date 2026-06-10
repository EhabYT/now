const { Events, EmbedBuilder } = require('discord.js');
const { getCached, setCached } = require('../utils/db');
const config = require('../utils/config');

const voiceJoinTimes = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        if (newState.member && newState.member.user.bot) return;

        const db = client.db;
        const logCfg = await db.get(`logging_${newState.guild.id}`);
        const logChId = logCfg?.voice;

        // Logging Logic
        if (logChId) {
            const logCh = await newState.guild.channels.fetch(logChId).catch(() => null);
            if (logCh) {
                const embed = new EmbedBuilder().setTimestamp();
                let send = false;

                if (!oldState.channelId && newState.channelId && newState.member) {
                    // Joined
                    embed.setColor(config.colors.success)
                        .setAuthor({ name: 'Voice Joined', iconURL: newState.member.user?.displayAvatarURL() })
                        .setDescription(`${newState.member} joined voice channel **${newState.channel.name}**`);
                    send = true;
                } else if (oldState.channelId && !newState.channelId && oldState.member) {
                    // Left
                    embed.setColor(config.colors.error)
                        .setAuthor({ name: 'Voice Left', iconURL: oldState.member.user?.displayAvatarURL() })
                        .setDescription(`${oldState.member} left voice channel **${oldState.channel.name}**`);
                    send = true;
                } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId && newState.member) {
                    // Moved
                    const moveLogChId = logCfg?.move;
                    const moveLogCh = moveLogChId ? (await newState.guild.channels.fetch(moveLogChId).catch(() => null)) : logCh;

                    if (moveLogCh) {
                        embed.setColor(config.colors.info || '#00fbff')
                            .setAuthor({ name: 'Voice Moved', iconURL: newState.member.user?.displayAvatarURL() })
                            .setDescription(`${newState.member} moved from **${oldState.channel.name}** to **${newState.channel.name}**`);

                        if (moveLogCh.id !== logCh.id) {
                            await moveLogCh.send({ embeds: [embed] }).catch(() => {});
                        } else {
                            send = true;
                        }
                    }
                }

                // Mute/Deafen Logging (only when member is in a channel)
                const muteLogChId = logCfg?.mute_def;
                const muteLogCh = muteLogChId ? (await newState.guild.channels.fetch(muteLogChId).catch(() => null)) : logCh;
                const activeChannel = newState.channel || oldState.channel;

                if (muteLogCh && activeChannel && newState.member) {
                    const muteEmbed = new EmbedBuilder().setTimestamp().setColor(config.colors.info || '#00fbff');
                    let muteSend = false;
                    const channelName = activeChannel.name;

                    if (oldState.selfMute !== newState.selfMute) {
                        muteEmbed.setAuthor({ name: newState.selfMute ? 'Self Muted' : 'Self Unmuted', iconURL: newState.member.user?.displayAvatarURL() })
                            .setDescription(`${newState.member} ${newState.selfMute ? 'muted' : 'unmuted'} themselves in **${channelName}**`);
                        muteSend = true;
                    } else if (oldState.selfDeaf !== newState.selfDeaf) {
                        muteEmbed.setAuthor({ name: newState.selfDeaf ? 'Self Deafened' : 'Self Undeafened', iconURL: newState.member.user?.displayAvatarURL() })
                            .setDescription(`${newState.member} ${newState.selfDeaf ? 'deafened' : 'undeafened'} themselves in **${channelName}**`);
                        muteSend = true;
                    } else if (oldState.serverMute !== newState.serverMute) {
                        muteEmbed.setAuthor({ name: newState.serverMute ? 'Server Muted' : 'Server Unmuted', iconURL: newState.member.user?.displayAvatarURL() })
                            .setDescription(`${newState.member} was ${newState.serverMute ? 'server muted' : 'server unmuted'} in **${channelName}**`);
                        muteSend = true;
                    } else if (oldState.serverDeaf !== newState.serverDeaf) {
                        muteEmbed.setAuthor({ name: newState.serverDeaf ? 'Server Deafened' : 'Server Undeafened', iconURL: newState.member.user?.displayAvatarURL() })
                            .setDescription(`${newState.member} was ${newState.serverDeaf ? 'server deafened' : 'server undeafened'} in **${channelName}**`);
                        muteSend = true;
                    }

                    if (muteSend) {
                        await muteLogCh.send({ embeds: [muteEmbed] }).catch(() => {});
                    }
                }

                if (send) await logCh.send({ embeds: [embed] }).catch(() => {});
            }
        }

        // Stats & XP Logic
        if (!oldState.channelId && newState.channelId && newState.member) {
            voiceJoinTimes.set(newState.member.id, Date.now());
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId && newState.member) {
            // Voice move — save time from old channel, reset timer for new
            const startTime = voiceJoinTimes.get(newState.member.id);
            if (startTime) {
                const duration = Date.now() - startTime;
                const statsKey = `stats_${newState.guild.id}_${newState.member.id}`;
                const stats = await getCached(statsKey) || { messages: 0, voiceTime: 0, reactions: 0 };
                stats.voiceTime += duration;
                await setCached(statsKey, stats);

                const xpKey = `xp_${newState.guild.id}_${newState.member.id}`;
                const xpData = await getCached(xpKey) || { textXp: 0, textLevel: 1, voiceXp: 0, voiceLevel: 1 };
                xpData.voiceXp = (xpData.voiceXp || 0) + Math.floor(duration / 60000) * 10;
                while (xpData.voiceXp >= xpData.voiceLevel * 100) {
                    xpData.voiceXp -= xpData.voiceLevel * 100;
                    xpData.voiceLevel++;
                }
                await setCached(xpKey, xpData);
            }
            voiceJoinTimes.set(newState.member.id, Date.now());
        } else if (oldState.channelId && !newState.channelId && oldState.member) {
            const startTime = voiceJoinTimes.get(oldState.member.id);
            if (startTime) {
                const duration = Date.now() - startTime;
                voiceJoinTimes.delete(oldState.member.id);

                const statsKey = `stats_${oldState.guild.id}_${oldState.member.id}`;
                const stats = await getCached(statsKey) || { messages: 0, voiceTime: 0, reactions: 0 };
                stats.voiceTime += duration;
                await setCached(statsKey, stats);

                const xpKey = `xp_${oldState.guild.id}_${oldState.member.id}`;
                const xpData = await getCached(xpKey) || { textXp: 0, textLevel: 1, voiceXp: 0, voiceLevel: 1 };
                xpData.voiceXp = (xpData.voiceXp || 0) + Math.floor(duration / 60000) * 10;
                while (xpData.voiceXp >= xpData.voiceLevel * 100) {
                    xpData.voiceXp -= xpData.voiceLevel * 100;
                    xpData.voiceLevel++;
                }
                await setCached(xpKey, xpData);
            }
        }
    },
    cleanup() {
        const now = Date.now();
        for (const [userId, startTime] of voiceJoinTimes.entries()) {
            if (now - startTime > 86400000) {
                voiceJoinTimes.delete(userId);
            }
        }
    }
};

