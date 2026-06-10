const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qr')
        .setDescription('Generate a QR code for text or a URL')
        .setDescriptionLocalizations({ de: 'QR-Code für Text oder URL generieren' })
        .addStringOption(opt => opt.setName('text').setDescription('The text or URL to encode').setRequired(true)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const text = interaction.options.getString('text');
        const { safeReply } = client.helpers;

        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;

        const embed = new EmbedBuilder()
            .setColor('#FFFFFF')
            .setTitle('' + emojis.import + ' ' + t('bot.qr.title', lang))
            .setDescription(tWithVars('bot.qr.generated_for', { text: text.length > 50 ? text.substring(0, 47) + '...' : text }, lang))
            .setImage(qrUrl)
            .setFooter({ text: t('bot.qr.powered_by', lang) })
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
