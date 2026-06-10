const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const config = require('../../utils/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Debug the server to check some standard issues')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, client, db) {
        const botMember = interaction.guild.members.me;
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle(`${emojis.builder} Debug Information`)
            .addFields(
                { name: 'Server', value: `${interaction.guild.name} (\`${interaction.guild.id}\`)`, inline: true },
                { name: 'Channel', value: `${interaction.channel.name} (\`${interaction.channel.id}\`)`, inline: true },
                { name: 'Bot Perms', value: botMember.permissions.toArray().slice(0, 10).join(', ') || 'None', inline: false },
                { name: 'Members', value: `${interaction.guild.memberCount}`, inline: true },
                { name: 'Bot Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
                { name: 'Is Ticket', value: interaction.channel.name?.startsWith('ticket-') ? 'Yes' : 'No', inline: true }
            )
            .setTimestamp();
        await safeReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};
