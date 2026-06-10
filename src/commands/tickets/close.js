const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached, setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Closes the current ticket')
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for closing')),

    async execute(interaction, client, db) {
        if (!interaction.channel.name?.startsWith('ticket-')) return safeReply(interaction, { content: `${emojis.cross} Use this in a ticket channel.`, flags: [MessageFlags.Ephemeral] });
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guildId = interaction.guild.id;
        const ticketConfig = await getCached(`tickets_${guildId}`) || {};
        const existingTickets = await getCached(`opentickets_${guildId}`) || {};
        let ticketOwner = null;
        for (const [userId, channelId] of Object.entries(existingTickets)) {
            if (channelId === interaction.channel.id) { ticketOwner = userId; break; }
        }

        if (ticketConfig.logChannel) {
            const logCh = interaction.guild.channels.cache.get(ticketConfig.logChannel);
            if (logCh) {
                const msgs = await interaction.channel.messages.fetch({ limit: 100 });
                const transcript = [...msgs.values()].reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author?.username || 'Unknown'}: ${m.content || '[embed]'}`).join('\n');
                const embed = new EmbedBuilder().setColor('#ff4757').setTitle(`${emojis.ticket} Ticket Closed`).addFields({ name: 'Channel', value: interaction.channel.name, inline: true }, { name: 'Closed by', value: `${interaction.user}`, inline: true }, { name: 'Reason', value: reason, inline: false }).setDescription(`\`\`\`\n${transcript.slice(0, 4000)}\n\`\`\``).setTimestamp();
                await logCh.send({ embeds: [embed] }).catch(() => {});
            }
        }
        if (ticketOwner) { delete existingTickets[ticketOwner]; await setCached(`opentickets_${guildId}`, existingTickets); }
        await safeReply(interaction, { content: `${emojis.lock} Closing ticket in 5 seconds...` });
        setTimeout(() => interaction.channel.delete().catch(e => logger.warn('Delete failed', { error: e.message })), 5000);
    }
};
