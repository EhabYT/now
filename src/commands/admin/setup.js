const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup and configuration editor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('category').setDescription('Category to create tickets in').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel for ticket logs'))
        .addRoleOption(opt => opt.setName('support_role').setDescription('Support role for tickets')),

    async execute(interaction, client, db) {
        const category = interaction.options.getChannel('category');
        const logChannel = interaction.options.getChannel('log_channel');
        const supportRole = interaction.options.getRole('support_role');

        const existing = await db.get(`tickets_${interaction.guild.id}`) || {};
        const newConfig = {
            categoryId: category?.id || existing.categoryId || existing.category || null,
            logChannel: logChannel?.id || existing.logChannel || null,
            supportRole: supportRole?.id || existing.supportRole || null,
            enabled: true
        };
        await setCached(`tickets_${interaction.guild.id}`, newConfig);

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.check} Ticket Configuration`)
            .addFields(
                { name: 'Category', value: category ? `${category.name}` : '*(unchanged)*', inline: true },
                { name: 'Log Channel', value: logChannel ? `${logChannel}` : '*(unchanged)*', inline: true },
                { name: 'Support Role', value: supportRole ? `${supportRole}` : '*(unchanged)*', inline: true }
            )
            .setTimestamp();
        await safeReply(interaction, { embeds: [embed] });
    }
};
