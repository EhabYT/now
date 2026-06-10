const { Events, EmbedBuilder, AuditLogEvent, Collection } = require('discord.js');
const config = require('../utils/config');
const logger = require('../utils/logger');
const emojis = require('../utils/emojis');

module.exports = [
    {
        name: Events.GuildMemberAdd,
        async execute(member, client) {
            const db = client.db;
            const welcomeCfg = await db.get(`welcome_${member.guild.id}`);

            // Invite Tracking
            let inviteInfo = 'Unknown';
            try {
                const newInvites = await member.guild.invites.fetch();
                const oldInvites = client.invites.get(member.guild.id);
                const invite = newInvites.find(i => i.uses > (oldInvites?.get(i.code) || 0));

                if (invite) {
                    inviteInfo = `Code: \`${invite.code}\` | Inviter: ${invite.inviter || 'System'}`;
                    // Update cache
                    client.invites.set(member.guild.id, new Collection(newInvites.map(i => [i.code, i.uses])));
                }
            } catch (err) {
                logger.error(`Invite tracking error in ${member.guild.name}`, { error: err.message });
            }

            if (welcomeCfg && welcomeCfg.enabled && welcomeCfg.channelId) {
                const welcomeCh = await member.guild.channels.fetch(welcomeCfg.channelId).catch(() => null);
                if (welcomeCh) {
                    let content = welcomeCfg.message || 'Welcome {user} to {guild}!';
                    const replaceVars = (str) => str.replace(/{user}/g, String(member))
                        .replace(/{userName}/g, member.user.username)
                        .replace(/{guild}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount);

                    content = replaceVars(content);
                    const payload = { content };

                    if (welcomeCfg.embed && welcomeCfg.embed.title) {
                        const embedData = welcomeCfg.embed;
                        const embed = new EmbedBuilder().setColor(embedData.color || config.colors.primary);

                        if (embedData.title) embed.setTitle(replaceVars(embedData.title));
                        if (embedData.description) embed.setDescription(replaceVars(embedData.description));
                        if (embedData.footer) embed.setFooter({ text: replaceVars(embedData.footer) });
                        if (embedData.image) embed.setImage(embedData.image);
                        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);

                        if (embedData.fields && Array.isArray(embedData.fields)) {
                            embed.addFields(embedData.fields.map(f => ({
                                name: replaceVars(f.name),
                                value: replaceVars(f.value),
                                inline: f.inline
                            })));
                        }

                        payload.embeds = [embed];
                    }

                    await welcomeCh.send(payload).catch(() => {});
                }
            }

            if (welcomeCfg && welcomeCfg.autoRoleId) {
                const role = member.guild.roles.cache.get(welcomeCfg.autoRoleId);
                if (role) await member.roles.add(role).catch(() => { });
            }

            const logCfg = await db.get(`logging_${member.guild.id}`) || {};
            const logChId = logCfg.members;
            if (!logChId) return;

            const logCh = await member.guild.channels.fetch(logChId).catch(() => null);
            if (!logCh) return;

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('' + emojis.users + ' Member Joined')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'User', value: `${member.user.username} (${member.id})`, inline: true },
                    { name: 'Invite Used', value: inviteInfo, inline: false },
                    { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: `Members: ${member.guild.memberCount}` })
                .setTimestamp();

            await logCh.send({ embeds: [embed] }).catch(() => {});
        }
    },
    {
        name: Events.GuildMemberRemove,
        async execute(member, client) {
            const db = client.db;
            const logCfg = await db.get(`logging_${member.guild.id}`) || {};

            // Kick Detection
            const kickLogChId = logCfg.kick || logCfg.moderation;
            const kickLogCh = kickLogChId ? await member.guild.channels.fetch(kickLogChId).catch(() => null) : null;

            if (kickLogCh) {
                try {
                    const fetchedLogs = await member.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberKick
                    });
                    const kickLog = fetchedLogs.entries.first();
                    if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp) < 5000) {
                        const embed = new EmbedBuilder()
                            .setColor(config.colors.error)
                            .setTitle('' + emojis.kick + ' Member Kicked')
                            .setThumbnail(member.user.displayAvatarURL())
                            .addFields(
                                { name: 'User', value: `${member.user.username} (${member.id})`, inline: true },
                                { name: 'Kicked By', value: `${kickLog.executor?.username || 'Unknown'}`, inline: true },
                                { name: 'Reason', value: kickLog.reason || 'No reason provided' }
                            )
                            .setTimestamp();
                        await kickLogCh.send({ embeds: [embed] }).catch(() => {});
                        return; // Skip leave log if it's a kick
                    }
                } catch (err) {
                    logger.error(`Kick tracking error in ${member.guild.name}`, { error: err.message });
                }
            }

            const welcomeCfg = await db.get(`welcome_${member.guild.id}`);

            if (welcomeCfg && welcomeCfg.enabled && welcomeCfg.leaveChannel) {
                const leaveCh = await member.guild.channels.fetch(welcomeCfg.leaveChannel).catch(() => null);
                if (leaveCh) {
                    let msg = welcomeCfg.leaveMessage || '{user} has left the server.';
                    msg = msg.replace(/{user}/g, member.user.username)
                        .replace(/{guild}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount);
                    await leaveCh.send(msg).catch(() => {});
                }
            }

            const leaveLogChId = logCfg.member_leave || logCfg.members;
            const leaveLogCh = leaveLogChId ? await member.guild.channels.fetch(leaveLogChId).catch(() => null) : null;

            if (leaveLogCh) {
                const embed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('' + emojis.users + ' Member Left')
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: 'User', value: `${member.user.username} (${member.id})`, inline: true },
                        { name: 'Joined At', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
                    )
                    .setFooter({ text: `Members: ${member.guild.memberCount}` })
                    .setTimestamp();

                await leaveLogCh.send({ embeds: [embed] }).catch(() => {});
            }
        }
    },
    {
        name: Events.InviteCreate,
        async execute(invite, client) {
            const guildInvites = client.invites.get(invite.guild.id) || new Map();
            guildInvites.set(invite.code, invite.uses);
            client.invites.set(invite.guild.id, guildInvites);

            // Logging
            const logCfg = await client.db.get(`logging_${invite.guild.id}`) || {};
            const logChId = logCfg.invites;
            if (!logChId) return;

            const logCh = await invite.guild.channels.fetch(logChId).catch(() => null);
            if (!logCh) return;

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('' + emojis.mail + ' Invite Created')
                .addFields(
                    { name: 'Inviter', value: `${invite.inviter?.username || 'System'}`, inline: true },
                    { name: 'Code', value: `\`${invite.code}\``, inline: true },
                    { name: 'Channel', value: `${invite.channel}`, inline: true },
                    { name: 'Max Uses', value: `${invite.maxUses === 0 ? 'Unlimited' : invite.maxUses}`, inline: true },
                    { name: 'Expires', value: invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Never', inline: true }
                )
                .setTimestamp();

            await logCh.send({ embeds: [embed] }).catch(() => {});
        }
    },
    {
        name: Events.InviteDelete,
        async execute(invite, client) {
            const guildInvites = client.invites.get(invite.guild.id);
            if (guildInvites) {
                guildInvites.delete(invite.code);
            }

            // Logging
            const logCfg = await client.db.get(`logging_${invite.guild.id}`) || {};
            const logChId = logCfg.invites;
            if (!logChId) return;

            const logCh = await invite.guild.channels.fetch(logChId).catch(() => null);
            if (!logCh) return;

            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('' + emojis.mail + ' Invite Deleted')
                .addFields(
                    { name: 'Code', value: `\`${invite.code}\``, inline: true },
                    { name: 'Channel', value: `${invite.channel}`, inline: true }
                )
                .setTimestamp();

            await logCh.send({ embeds: [embed] }).catch(() => {});
        }
    }
];

