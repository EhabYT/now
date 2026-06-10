const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Configure granular logging')
        .setDescriptionLocalizations({ de: 'Granulare Protokollierung konfigurieren' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Link a log type to a channel')
                .addStringOption(opt => opt.setName('type').setDescription('Log type').setRequired(true)
                    .addChoices(
                        { name: 'Messages (Edits, Deletions)', value: 'messages' },
                        { name: 'Members (Joins, Leaves)', value: 'members' },
                        { name: 'Moderation (Kicks, Bans)', value: 'moderation' },
                        { name: 'Channels (Create, Delete)', value: 'channels' },
                        { name: 'Voice (Multi-User Join/Leave)', value: 'voice' },
                        { name: 'Invites (Creation, Deletion)', value: 'invites' },
                        { name: 'Mute/Deafen (Voice Mute/Deafen)', value: 'mute_def' },
                        { name: 'Server Update (Server Settings)', value: 'server_update' },
                        { name: 'Un-ban (Member Unbanned)', value: 'unban' },
                        { name: 'Role Update (Member Role Changes)', value: 'role_update' },
                        { name: 'Member Left (Explicit Leave)', value: 'member_leave' },
                        { name: 'Member Move (Voice Room Move)', value: 'move' },
                        { name: 'Kick (Member Kicked)', value: 'kick' },
                        { name: 'Delete Role (Role Deleted)', value: 'role_delete' },
                        { name: 'Delete Channel (Channel Deleted)', value: 'channel_delete' },
                        { name: 'Ban (Member Banned)', value: 'ban' },
                        { name: 'Threads (Create, Delete)', value: 'threads' }
                    ))
                .addChannelOption(opt => opt.setName('channel').setDescription('Target log channel').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Stop logging for a specific type')
                .addStringOption(opt => opt.setName('type').setDescription('Type to disable').setRequired(true)
                    .addChoices(
                        { name: 'Messages', value: 'messages' },
                        { name: 'Members', value: 'members' },
                        { name: 'Moderation', value: 'moderation' },
                        { name: 'Channels', value: 'channels' },
                        { name: 'Voice', value: 'voice' },
                        { name: 'Invites', value: 'invites' },
                        { name: 'Mute/Deafen', value: 'mute_def' },
                        { name: 'Server Update', value: 'server_update' },
                        { name: 'Un-ban', value: 'unban' },
                        { name: 'Role Update', value: 'role_update' },
                        { name: 'Member Left', value: 'member_leave' },
                        { name: 'Member Move', value: 'move' },
                        { name: 'Kick', value: 'kick' },
                        { name: 'Delete Role', value: 'role_delete' },
                        { name: 'Delete Channel', value: 'channel_delete' },
                        { name: 'Ban', value: 'ban' },
                        { name: 'Threads', value: 'threads' },
                        { name: 'Everything', value: 'all' }
                    ))
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('View current log channel configuration')
        )
        .addSubcommand(sub =>
            sub.setName('setup-standard')
                .setDescription('Automatically create and link standard logging channels')
        ),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup-standard') {
            if (!interaction.deferred && !interaction.replied) { await interaction.deferReply().catch(() => {}); }

            const mapping = {
                'messages': 'logs',
                'members': 'logs',
                'moderation': 'logs',
                'channels': 'logs',
                'voice': 'logs',
                'invites': 'logs',
                'ban': 'logs',
                'mute_def': 'mute-def',
                'server_update': 'seting-server',
                'unban': 'un-ban',
                'move': 'move',
                'kick': 'kick',
                'role_delete': 'remove-ch',
                'channel_delete': 'remove-ch'
            };

            const channelsNeeded = [...new Set(Object.values(mapping))];
            const channelMap = {};
            const config = await db.get(`logging_${interaction.guild.id}`) || {};

            try {
                for (const name of channelsNeeded) {
                    let ch = interaction.guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText);
                    if (!ch) {
                        ch = await interaction.guild.channels.create({
                            name: name,
                            type: ChannelType.GuildText,
                            reason: 'Automated Logging Setup'
                        });
                    }
                    channelMap[name] = ch.id;
                }

                for (const [type, chName] of Object.entries(mapping)) {
                    config[type] = channelMap[chName];
                }

                config['role_update'] = null;
                config['member_leave'] = null;

                await db.set(`logging_${interaction.guild.id}`, config);

                const embed = new EmbedBuilder()
                    .setColor('#00fbff')
                    .setTitle('' + emojis.rocket + ' ' + t('bot.logging.setup_done', lang))
                    .setDescription(t('bot.logging.setup_done', lang) + ':\n' +
                        channelsNeeded.map(n => `• **#${n}** → <#${channelMap[n]}>`).join('\n'))
                    .setFooter({ text: t('bot.logging.configured_points', lang) })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                return await interaction.editReply(`${emojis.cross} ${tWithVars('bot.logging.setup_failed', { error: err.message }, lang)}`);
            }
        }

        if (subcommand === 'setup') {
            const type = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel');
            const config = await db.get(`logging_${interaction.guild.id}`) || {};

            config[type] = channel.id;
            await db.set(`logging_${interaction.guild.id}`, config);

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle(`${emojis.satellite} ${t('bot.logging.point_established', lang)}`)
                .setDescription(tWithVars('bot.logging.linked', { type, channel: `${channel}` }, lang))
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'disable') {
            const type = interaction.options.getString('type');

            if (type === 'all') {
                await db.delete(`logging_${interaction.guild.id}`);
            } else {
                const config = await db.get(`logging_${interaction.guild.id}`) || {};
                delete config[type];
                await db.set(`logging_${interaction.guild.id}`, config);
            }

            const embed = new EmbedBuilder()
                .setColor('#ff4757')
                .setTitle(`${emojis.stop} ${t('bot.logging.disabled', lang)}`)
                .setDescription(type === 'all' ? t('bot.logging.all_disabled', lang) : tWithVars('bot.logging.type_disabled', { type }, lang))
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'status') {
            const config = await db.get(`logging_${interaction.guild.id}`) || {};
            const types = [
                'messages', 'members', 'moderation', 'channels', 'voice', 'invites',
                'mute_def', 'server_update', 'unban', 'role_update', 'member_leave',
                'move', 'kick', 'role_delete', 'channel_delete', 'ban', 'threads'
            ];

            const fields = types.map(t => ({
                name: t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                value: config[t] ? `${emojis.check} <#${config[t]}>` : '' + emojis.cross + ' ' + t('bot.logging.offline', lang),
                inline: true
            }));

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle('' + emojis.progress + ' ' + t('bot.logging.status_title', lang))
                .setDescription(t('bot.logging.status_desc', lang))
                .addFields(fields)
                .setFooter({ text: t('bot.logging.footer', lang), iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }
    }
};
