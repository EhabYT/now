const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a custom embed to a channel')
        .setDescriptionLocalizations({ de: 'Benutzerdefiniertes Embed an einen Kanal senden' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Embed title').setMaxLength(256))
        .addStringOption(opt => opt.setName('description').setDescription('Embed description').setMaxLength(4000))
        .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. #00fbff)'))
        .addStringOption(opt => opt.setName('footer').setDescription('Footer text').setMaxLength(2048))
        .addStringOption(opt => opt.setName('thumbnail').setDescription('Thumbnail image URL'))
        .addStringOption(opt => opt.setName('image').setDescription('Main image URL')),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || '#00fbff';
        const footer = interaction.options.getString('footer');
        const thumbnail = interaction.options.getString('thumbnail');
        const image = interaction.options.getString('image');

        if (!title && !description) {
            return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.embed.need_content', lang), flags: [MessageFlags.Ephemeral] });
        }

        const embed = new EmbedBuilder().setColor(color);
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (footer) embed.setFooter({ text: footer });
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        embed.setTimestamp();

        try {
            await channel.send({ embeds: [embed] });
            await safeReply(interaction, { content: emojis.check + ' ' + tWithVars('bot.embed.sent', { channel }, lang), flags: [MessageFlags.Ephemeral] });
        } catch (err) {
            await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.error.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
        }
    }
};
