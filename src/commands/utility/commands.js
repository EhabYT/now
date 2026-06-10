const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('[Admin] Ticket Tool dev command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client, db) {
        const cmdCount = client.commands?.size || 'N/A';
        const uptime = Math.floor(process.uptime());
        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.builder} Ticket Tool — Dev Info`)
            .addFields(
                { name: 'Commands Registered', value: `${cmdCount}`, inline: true },
                { name: 'Uptime', value: `${uptime}s`, inline: true },
                { name: 'Guild ID', value: interaction.guild.id, inline: true },
                { name: 'Bot ID', value: client.user.id, inline: true }
            )
            .setTimestamp();
        await safeReply(interaction, { embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};
