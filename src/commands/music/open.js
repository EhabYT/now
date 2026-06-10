const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached, setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('open')
        .setDescription('Opens the current ticket if it was closed')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client, db) {
        if (!interaction.channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} Use this in a ticket channel.`, flags: [MessageFlags.Ephemeral] });
        const opentickets = await getCached(`opentickets_${interaction.guild.id}`) || {};
        let ownerId = null;
        for (const [uid, cid] of Object.entries(opentickets)) {
            if (cid === interaction.channel.id) { ownerId = uid; break; }
        }
        if (ownerId) return safeReply(interaction, { content: `${emojis.cross} This ticket is already open.`, flags: [MessageFlags.Ephemeral] });
        ownerId = interaction.member.id;
        opentickets[ownerId] = interaction.channel.id;
        await setCached(`opentickets_${interaction.guild.id}`, opentickets);
        await safeReply(interaction, { content: `${emojis.unlock} Ticket re-opened.` });
    }
};
