const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached, setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete the current ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for deletion')),

    async execute(interaction, client, db) {
        if (!interaction.channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} Use this in a ticket channel.`, flags: [MessageFlags.Ephemeral] });
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const existingTickets = await getCached(`opentickets_${interaction.guild.id}`) || {};
        for (const [uid, cid] of Object.entries(existingTickets)) {
            if (cid === interaction.channel.id) { delete existingTickets[uid]; break; }
        }
        await setCached(`opentickets_${interaction.guild.id}`, existingTickets);
        await safeReply(interaction, { content: `${emojis.cross} Deleting ticket... **Reason:** ${reason}` });
        setTimeout(() => interaction.channel.delete().catch(e => logger.warn('Delete failed', { error: e.message })), 2000);
    }
};
