const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Let the bot make a choice for you')
        .setDescriptionLocalizations({ de: 'Lass den Bot eine Wahl für dich treffen' })
        .addStringOption(opt => opt.setName('options').setDescription('Options separated by commas (e.g. pizza, sushi, tacos)').setRequired(true).setMaxLength(500)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const raw = interaction.options.getString('options');
        const options = raw.split(',').map(o => o.trim()).filter(o => o.length > 0);
        if (options.length < 2) return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.choose.need_two', lang) });

        const choice = options[Math.floor(Math.random() * options.length)];
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(emojis.dice + ' ' + t('bot.choose.made', lang))
            .setDescription(tWithVars('bot.choose.result', { choice }, lang))
            .addFields({ name: 'Options', value: options.map(o => `• ${o}`).join('\n') })
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
