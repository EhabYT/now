const { SlashCommandBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('reverse')
        .setDescription('Reverse any text')
        .setDescriptionLocalizations({ de: 'Text umkehren' })
        .addStringOption(opt => opt.setName('text').setDescription('Text to reverse').setRequired(true).setMaxLength(1000)),

    async execute(interaction, client, db) {
        const text = interaction.options.getString('text');
        const reversed = text.split('').reverse().join('');

        await safeReply(interaction, {
            content: `**Original:**\n${text}\n\n**Reversed:**\n${reversed}`
        });
    }
};
