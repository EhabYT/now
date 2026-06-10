const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Buy premium and check the current status'),

    async execute(interaction, client, db) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Ticket Tool Premium')
            .setDescription('Unlock premium features:\n• Custom themes & branding\n• Unlimited tickets\n• Priority support\n• Advanced analytics\n• Custom panel designs')
            .addFields({ name: 'Status', value: 'Premium is available for purchase. Contact support for details.', inline: false })
            .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Purchase Premium').setURL('https://example.com/premium').setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Support Server').setURL('https://discord.gg/placeholder').setStyle(ButtonStyle.Link)
        );
        await safeReply(interaction, { embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    }
};
