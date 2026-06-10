const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Manage welcome messages')
        .setDescriptionLocalizations({ de: 'Begrüßungsnachrichten verwalten' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Setup welcome messages')
                .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
                .addStringOption(opt => opt.setName('message').setDescription('Message (use {user}, {server}, {memberCount})').setRequired(true))
                .addRoleOption(opt => opt.setName('auto_role').setDescription('Role to give on join'))
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable welcome messages')
        )
        .addSubcommand(sub =>
            sub.setName('test')
                .setDescription('Test the welcome message')
        ),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const message = interaction.options.getString('message');
            const autoRole = interaction.options.getRole('auto_role');

            await db.set(`welcome_${interaction.guild.id}`, {
                channelId: channel.id,
                message,
                autoRoleId: autoRole?.id,
                enabled: true
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('' + emojis.check + ' ' + t('bot.welcome.configured_title', lang))
                .addFields(
                    { name: t('bot.welcome.configured_channel', lang), value: `${channel}`, inline: true },
                    { name: t('bot.welcome.configured_auto_role', lang), value: autoRole ? `${autoRole}` : t('bot.welcome.configured_none', lang), inline: true }
                )
                .setDescription(`**${t('bot.welcome.configured_message', lang)}:**\n${message}`)
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'disable') {
            const config = await db.get(`welcome_${interaction.guild.id}`);
            if (config) {
                config.enabled = false;
                await db.set(`welcome_${interaction.guild.id}`, config);
            }

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('' + emojis.cross + ' ' + t('bot.welcome.disabled_title', lang))
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'test') {
            const config = await db.get(`welcome_${interaction.guild.id}`);

            if (!config || !config.enabled) {
                return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.welcome.not_setup', lang), flags: [MessageFlags.Ephemeral] });
            }

            const msg = config.message
                .replace(/{user}/g, interaction.user.toString())
                .replace(/{server}/g, interaction.guild.name)
                .replace(/{count}/g, interaction.guild.memberCount)
                .replace(/{memberCount}/g, interaction.guild.memberCount);

            const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);

            if (!channel) {
                return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.welcome.channel_not_found', lang), flags: [MessageFlags.Ephemeral] });
            }

            let sendErr = null;
            try {
                await channel.send(msg);
            } catch (err) {
                sendErr = err;
            }
            return await safeReply(interaction, { content: sendErr ? `${emojis.cross} ${t('bot.welcome.test_failed', lang).replace('{error}', sendErr.message)}` : `${emojis.check} ${t('bot.welcome.test_sent', lang).replace('{channel}', channel)}`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
