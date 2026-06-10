const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Rename the current ticket channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(opt => opt.setName('name').setDescription('New name for the ticket').setRequired(true)),

    async execute(interaction, client, db) {
        if (!interaction.channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} Use this in a ticket channel.`, flags: [MessageFlags.Ephemeral] });
        const name = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
        if (!name) return safeReply(interaction, { content: `${emojis.cross} Invalid name. Use letters, numbers, and hyphens.`, flags: [MessageFlags.Ephemeral] });
        await interaction.channel.setName(`ticket-${name}`);
        await safeReply(interaction, { content: `${emojis.check} Channel renamed to ticket-${name}.` });
    }
};
