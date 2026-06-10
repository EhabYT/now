const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached, setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim/Unclaim the current ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for claiming'))
        .addUserOption(opt => opt.setName('user').setDescription('User to assign the claim to')),

    async execute(interaction, client, db) {
        if (!interaction.channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} Use this in a ticket channel.`, flags: [MessageFlags.Ephemeral] });
        const target = interaction.options.getUser('user') || interaction.user;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const claimedKey = `ticket_claimed_${interaction.channel.id}`;
        const current = await getCached(claimedKey);
        if (current === target.id) {
            await setCached(claimedKey, null);
            await safeReply(interaction, { content: `${emojis.unlock} Ticket unclaimed.` });
        } else {
            await setCached(claimedKey, target.id);
            const embed = new EmbedBuilder().setColor('#00fbff').setTitle('Ticket Claimed').setDescription(`Claimed by ${target}\n**Reason:** ${reason}`).setTimestamp();
            await safeReply(interaction, { embeds: [embed] });
        }
    }
};
