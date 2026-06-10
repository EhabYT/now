const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage support tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Configure the ticket system')
                .addChannelOption(opt => opt.setName('category').setDescription('Category to create tickets in').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
                .addChannelOption(opt => opt.setName('log_channel').setDescription('Log channel'))
                .addRoleOption(opt => opt.setName('support_role').setDescription('Support role'))
        )
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Create a ticket panel')
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Close the current ticket')
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a user to the current ticket')
                .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a user from the current ticket')
                .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
        ),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const category = interaction.options.getChannel('category');
            const logChannel = interaction.options.getChannel('log_channel');
            const supportRole = interaction.options.getRole('support_role');

            await db.set(`tickets_${interaction.guild.id}`, {
                category: category.id,
                logChannel: logChannel?.id || null,
                supportRole: supportRole?.id || null,
                enabled: true
            });

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle('' + emojis.check + ' ' + t('bot.ticket.setup_done_title', lang))
                .addFields(
                    { name: t('bot.ticket.category', lang), value: `${category.name}`, inline: true },
                    { name: t('bot.ticket.log_channel', lang), value: logChannel ? `${logChannel}` : t('bot.ticket.not_set', lang), inline: true },
                    { name: t('bot.ticket.support_role', lang), value: supportRole ? `${supportRole}` : t('bot.ticket.not_set', lang), inline: true }
                )
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'panel') {
            const config = await db.get(`tickets_${interaction.guild.id}`);
            if (!config) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.ticket.no_category', lang), flags: [MessageFlags.Ephemeral] });

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle('' + emojis.ticket + ' ' + t('bot.ticket.panel_title', lang))
                .setDescription(t('bot.ticket.panel_desc', lang))
                .setFooter({ text: t('bot.ticket.panel_footer', lang) })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel(t('bot.ticket.panel_button', lang)).setStyle(ButtonStyle.Primary).setEmoji('' + emojis.ticket + '')
            );

            await interaction.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
            return await safeReply(interaction, { content: '' + emojis.check + ' ' + t('bot.ticket.panel_created', lang), flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === 'close') {
            if (!interaction.channel.name.startsWith('ticket-')) {
                return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.ticket.not_ticket_channel', lang), flags: [MessageFlags.Ephemeral] });
            }

            const guildId = interaction.guild.id;
            const ticketConfig = await db.get(`tickets_${guildId}`);
            const existingTickets = await db.get(`opentickets_${guildId}`) || {};
            let ticketOwner = null;

            for (const [userId, channelId] of Object.entries(existingTickets)) {
                if (channelId === interaction.channel.id) { ticketOwner = userId; break; }
            }

            if (ticketConfig?.logChannel) {
                const logChannel = await interaction.guild.channels.fetch(ticketConfig.logChannel).catch(() => null);
                if (logChannel) {
                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    const transcript = messages.reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author?.username || 'Unknown'}: ${m.content || '[embed]'}`).join('\n');

                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff4757')
                        .setTitle('' + emojis.ticket + ' ' + t('bot.ticket.closed_title', lang))
                        .addFields(
                            { name: t('bot.ticket.log_channel', lang), value: interaction.channel.name, inline: true },
                            { name: t('bot.ticket.closed_by', lang), value: `${interaction.user}`, inline: true },
                            { name: t('bot.ticket.owner', lang), value: ticketOwner ? `<@${ticketOwner}>` : t('bot.ticket.not_set', lang), inline: true }
                        )
                        .setDescription(`\`\`\`\n${transcript.slice(0, 4000)}\n\`\`\``)
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }

            if (ticketOwner) {
                delete existingTickets[ticketOwner];
                await db.set(`opentickets_${guildId}`, existingTickets);
            }

            await safeReply(interaction, { content: '' + emojis.lock + ' ' + t('bot.ticket.closing', lang) });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch (e) { logger.warn('Failed to delete ticket channel', { error: e.message }); }
            }, 5000);
        }

        if (subcommand === 'add') {
            if (!interaction.channel.name.startsWith('ticket-')) {
                return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.ticket.not_ticket_channel', lang), flags: [MessageFlags.Ephemeral] });
            }
            const user = interaction.options.getUser('user');
            try {
                await interaction.channel.permissionOverwrites.edit(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
                const embed = new EmbedBuilder()
                    .setColor('#00fbff')
                    .setDescription(`${emojis.check} ${t('bot.ticket.added_user', lang).replace('{user}', user)}`)
                    .setTimestamp();
                return await safeReply(interaction, { embeds: [embed] });
            } catch (err) {
                return await safeReply(interaction, { content: `${emojis.cross} ${t('bot.ticket.failed', lang).replace('{error}', err.message)}`, flags: [MessageFlags.Ephemeral] });
            }
        }

        if (subcommand === 'remove') {
            if (!interaction.channel.name.startsWith('ticket-')) {
                return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.ticket.not_ticket_channel', lang), flags: [MessageFlags.Ephemeral] });
            }
            const user = interaction.options.getUser('user');
            try {
                await interaction.channel.permissionOverwrites.delete(user.id);
                const embed = new EmbedBuilder()
                    .setColor('#ffa502')
                    .setDescription(`${emojis.check} ${t('bot.ticket.removed_user', lang).replace('{user}', user)}`)
                    .setTimestamp();
                return await safeReply(interaction, { embeds: [embed] });
            } catch (err) {
                return await safeReply(interaction, { content: `${emojis.cross} ${t('bot.ticket.failed', lang).replace('{error}', err.message)}`, flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
