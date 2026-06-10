const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

const responses = [
    'It is certain.', 'It is decidedly so.', 'Without a doubt.',
    'Yes definitely.', 'You may rely on it.', 'As I see it, yes.',
    'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
    'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
    'Cannot predict now.', 'Concentrate and ask again.',
    'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
    'Outlook not so good.', 'Very doubtful.'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true).setMaxLength(500)),

    async execute(interaction, client, db) {
        const question = interaction.options.getString('question');
        const answer = responses[Math.floor(Math.random() * responses.length)];

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.dice} Magic 8-Ball`)
            .addFields(
                { name: 'Question', value: question, inline: false },
                { name: 'Answer', value: answer, inline: false }
            )
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
