const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Create a panel message for creating tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(opt => opt.setName('panels').setDescription('Panel ID or name')),

    async execute(interaction, client, db) {
        const config = await getCached(`tickets_${interaction.guild.id}`) || {};
        if (!config.categoryId && !config.category) return safeReply(interaction, { content: `${emojis.cross} Ticket system not configured. Use /setup first.`, flags: [MessageFlags.Ephemeral] });

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle('🎫 Support Tickets')
            .setDescription('Click the button below to create a support ticket.')
            .setFooter({ text: 'One open ticket at a time.' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_ticket').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        );
        await interaction.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
        await safeReply(interaction, { content: `${emojis.check} Panel sent!`, flags: [MessageFlags.Ephemeral] });
    }
};
