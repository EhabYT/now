const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a user or role from a ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addUserOption(opt => opt.setName('user').setDescription('User to remove'))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove'))
        .addStringOption(opt => opt.setName('ticket').setDescription('Ticket channel ID or name'))
        .addBooleanOption(opt => opt.setName('revoke').setDescription('Revoke all access')),

    async execute(interaction, client, db) {
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        if (!user && !role) return safeReply(interaction, { content: `${emojis.cross} Mention a user or role to remove.`, flags: [MessageFlags.Ephemeral] });

        let channel = interaction.channel;
        const ticketOpt = interaction.options.getString('ticket');
        if (ticketOpt) {
            const id = ticketOpt.replace(/<#|>/g, '');
            channel = interaction.guild.channels.cache.get(id) || interaction.guild.channels.cache.find(c => c.name === ticketOpt);
            if (!channel) return safeReply(interaction, { content: `${emojis.cross} Ticket channel not found.`, flags: [MessageFlags.Ephemeral] });
        }
        if (!channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} That is not a ticket channel.`, flags: [MessageFlags.Ephemeral] });

        try {
            const id = user ? user.id : role.id;
            await channel.permissionOverwrites.delete(id);
            const name = user ? user.toString() : role.toString();
            const embed = new EmbedBuilder().setColor('#ffa502').setDescription(`${emojis.check} Removed ${name} from ${channel}`).setTimestamp();
            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            await safeReply(interaction, { content: `${emojis.cross} Failed: ${err.message}`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
