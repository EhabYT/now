const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin!')
        .setDescriptionLocalizations({ de: 'Eine Münze werfen!' }),

    async execute(interaction, client, db) {
        const { safeReply } = client.helpers;
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const icon = result === 'Heads' ? '' + emojis.coin + '' : '' + emojis.save + '';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${icon} Coin Flip`)
            .setDescription(`The coin landed on: **${result}**!`)
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
