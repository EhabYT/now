const { SlashCommandBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('mock')
        .setDescription('Mock text in alternating caps')
        .setDescriptionLocalizations({ de: 'Text in wechselnden Großbuchstaben verspotten' })
        .addStringOption(opt => opt.setName('text').setDescription('Text to mock').setRequired(true).setMaxLength(500)),

    async execute(interaction, client, db) {
        const text = interaction.options.getString('text');
        const mocked = text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');

        await safeReply(interaction, {
            content: `${emojis.grinning} ${mocked}`
        });
    }
};
