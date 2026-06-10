const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('permissionlevel')
        .setDescription('Display your current permission level with Ticket Tool')
        .addUserOption(opt => opt.setName('user').setDescription('User to check')),

    async execute(interaction, client, db) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        if (!member) return safeReply(interaction, { content: `${emojis.cross} User not found on this server.`, flags: [MessageFlags.Ephemeral] });

        let level = 0;
        if (member.id === interaction.guild.ownerId) level = 4;
        else if (member.permissions.has(PermissionFlagsBits.Administrator)) level = 3;
        else if (member.permissions.has(PermissionFlagsBits.ManageGuild)) level = 2;
        else if (member.permissions.has(PermissionFlagsBits.ManageChannels)) level = 1;

        const levelNames = { 0: 'Member', 1: 'Moderator', 2: 'Manager', 3: 'Admin', 4: 'Owner' };
        await safeReply(interaction, { content: `${targetUser} has permission level **${level}** (${levelNames[level]}).` });
    }
};
