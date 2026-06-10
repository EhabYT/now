const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote & earn free premium')
        .addStringOption(opt => opt.setName('options').setDescription('Vote option'))
        .addUserOption(opt => opt.setName('user').setDescription('User to vote for')),

    async execute(interaction, client, db) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Vote for Ticket Tool')
            .setDescription('Vote for us and earn free premium perks!\n\n• Vote on top.gg\n• Earn premium credits\n• Support the bot')
            .addFields({ name: 'How to Vote', value: 'Click the button below to vote on top.gg. Every vote gives you premium credits.', inline: false })
            .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Vote Now').setURL('https://top.gg/bot/placeholder/vote').setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Check Status').setURL('https://example.com/votes').setStyle(ButtonStyle.Link)
        );
        await safeReply(interaction, { embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
};
