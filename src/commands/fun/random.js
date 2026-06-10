const { SlashCommandBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random')
        .setDescription('Generate a random number between two values')
        .setDescriptionLocalizations({ de: 'Zufallszahl zwischen zwei Werten generieren' })
        .addIntegerOption(opt => opt.setName('min').setDescription('Minimum value').setRequired(true))
        .addIntegerOption(opt => opt.setName('max').setDescription('Maximum value').setRequired(true)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        let min = interaction.options.getInteger('min');
        let max = interaction.options.getInteger('max');

        if (min > max) {
            [min, max] = [max, min];
        }

        const result = Math.floor(Math.random() * (max - min + 1)) + min;

        await safeReply(interaction, {
            content: `${emojis.dice} ${tWithVars('bot.random.result', { min, max, result }, lang)}`
        });
    }
};
