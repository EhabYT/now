const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');
const config = require('../../utils/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupverification')
        .setDescription('Setup a verification system for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the verification message in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to give to verified users')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title of the verification embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the verification embed')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('button_label')
                .setDescription('Label for the verification button')
                .setRequired(false)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const title = interaction.options.getString('title') || t('bot.verification.setup_title', lang);
        const description = interaction.options.getString('description') || t('bot.verification.setup_desc', lang);
        const buttonLabel = interaction.options.getString('button_label') || t('bot.verification.button_verify', lang);

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.verification.no_perm_roles', lang), flags: [MessageFlags.Ephemeral] });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.verification.role_too_high', lang), flags: [MessageFlags.Ephemeral] });
        }

        try {
            await db.set(`verification_${interaction.guild.id}`, {
                roleId: role.id,
                channelId: channel.id
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors?.success || '#00FF00')
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verification_entry')
                        .setLabel(buttonLabel)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('' + emojis.check + '')
                );

            await channel.send({ embeds: [embed], components: [row] });

            await safeReply(interaction, { content: `${emojis.check} ${t('bot.verification.setup_success', lang).replace('{channel}', channel).replace('{role}', role)}`, flags: [MessageFlags.Ephemeral] });

        } catch (error) {
            logger.error('Verification setup error', { error: error.message });
            await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.verification.setup_error', lang), flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }
};
