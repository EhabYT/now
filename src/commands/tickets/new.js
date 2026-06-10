const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached, setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('new')
        .setDescription('Create a ticket')
        .addUserOption(opt => opt.setName('user').setDescription('User to create the ticket for'))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ticket')),

    async execute(interaction, client, db) {
        const config = await getCached(`tickets_${interaction.guild.id}`) || {};
        if (!config.categoryId && !config.category) return safeReply(interaction, { content: `${emojis.cross} Ticket system not configured. Use /setup first.`, flags: [MessageFlags.Ephemeral] });

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const opentickets = await getCached(`opentickets_${interaction.guild.id}`) || {};
        if (opentickets[targetUser.id]) {
            const ch = interaction.guild.channels.cache.get(opentickets[targetUser.id]);
            return safeReply(interaction, { content: `${emojis.cross} ${targetUser} already has an open ticket: ${ch ? ch.toString() : opentickets[targetUser.id]}`, flags: [MessageFlags.Ephemeral] });
        }

        const suffix = targetUser.id.slice(-4);
        const channelName = `ticket-${Date.now()}-${suffix}`;
        const parentId = config.categoryId || config.category;

        try {
            const channel = await interaction.guild.channels.create({
                name: channelName, type: ChannelType.GuildText, parent: parentId,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: targetUser.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                ]
            });
            if (config.supportRole) {
                await channel.permissionOverwrites.create(config.supportRole, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            }

            opentickets[targetUser.id] = channel.id;
            await setCached(`opentickets_${interaction.guild.id}`, opentickets);

            const embed = new EmbedBuilder().setColor('#00fbff').setTitle('Support Ticket').setDescription(`Ticket created by ${targetUser}\n**Reason:** ${reason}`).setFooter({ text: 'Use /close to close this ticket' }).setTimestamp();
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
            await channel.send({ content: targetUser.toString(), embeds: [embed], components: [row] });
            await safeReply(interaction, { content: `${emojis.check} Ticket created: ${channel}`, flags: [MessageFlags.Ephemeral] });

            if (config.logChannel) {
                const logCh = interaction.guild.channels.cache.get(config.logChannel);
                if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#00fbff').setTitle('Ticket Created').setDescription(`**User:** ${targetUser}\n**Channel:** ${channel}\n**Reason:** ${reason}`).setTimestamp()] }).catch(() => {});
            }
        } catch (err) {
            logger.error('Failed to create ticket', { error: err.message });
            await safeReply(interaction, { content: `${emojis.cross} Failed to create ticket: ${err.message}`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
