const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('closerequest')
        .setDescription('Request to close the current ticket')
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for closing')),

    async execute(interaction, client, db) {
        if (!interaction.channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} Use this in a ticket channel.`, flags: [MessageFlags.Ephemeral] });
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const config = await getCached(`tickets_${interaction.guild.id}`) || {};
        const embed = new EmbedBuilder().setColor('#ffa502').setTitle('Close Requested').setDescription(`${interaction.user} has requested to close this ticket.\n**Reason:** ${reason}`).setTimestamp();
        await interaction.channel.send({ embeds: [embed] }).catch(() => {});
        if (config.logChannel) {
            const logCh = interaction.guild.channels.cache.get(config.logChannel);
            if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ffa502').setTitle('Close Request').setDescription(`**Ticket:** ${interaction.channel.name}\n**By:** ${interaction.user}\n**Reason:** ${reason}`).setTimestamp()] }).catch(() => {});
        }
        await safeReply(interaction, { content: `${emojis.check} Close request sent.`, flags: [MessageFlags.Ephemeral] });
    }
};
