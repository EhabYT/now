const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached, setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete all tickets in the server (Confirmation required)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client, db) {
        const opentickets = await getCached(`opentickets_${interaction.guild.id}`) || {};
        const ticketIds = Object.values(opentickets);
        if (!ticketIds.length) return safeReply(interaction, { content: `${emojis.cross} No open tickets found.`, flags: [MessageFlags.Ephemeral] });

        let deleted = 0;
        for (const id of ticketIds) {
            const ch = interaction.guild.channels.cache.get(id);
            if (ch) { try { await ch.delete(); deleted++; } catch (e) { logger.warn(`Purge skip ${id}: ${e.message}`); } }
        }
        await setCached(`opentickets_${interaction.guild.id}`, {});
        await safeReply(interaction, { content: `${emojis.check} Purged **${deleted}** ticket channel(s).` });
    }
};
