const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Get information about a channel')
        .setDescriptionLocalizations({ de: 'Informationen über einen Kanal anzeigen' })
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(false)),

    async execute(interaction, client, db) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const typeNames = {
            [ChannelType.GuildText]: 'Text',
            [ChannelType.GuildVoice]: 'Voice',
            [ChannelType.GuildCategory]: 'Category',
            [ChannelType.GuildAnnouncement]: 'Announcement',
            [ChannelType.AnnouncementThread]: 'Announcement Thread',
            [ChannelType.PublicThread]: 'Public Thread',
            [ChannelType.PrivateThread]: 'Private Thread',
            [ChannelType.GuildStageVoice]: 'Stage',
            [ChannelType.GuildForum]: 'Forum'
        };

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.channel} Channel Info — #${channel.name}`)
            .addFields(
                { name: 'ID', value: channel.id, inline: true },
                { name: 'Type', value: typeNames[channel.type] || 'Unknown', inline: true },
                { name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: true },
                { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:f>`, inline: true },
                { name: 'Position', value: `${channel.position}`, inline: true }
            )
            .setTimestamp();

        if (channel.type === ChannelType.GuildText) {
            embed.addFields({ name: 'Topic', value: channel.topic || 'No topic', inline: false });
            embed.addFields({ name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true });
            embed.addFields({ name: 'Slowmode', value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'Off', inline: true });
        }

        if (channel.type === ChannelType.GuildVoice) {
            embed.addFields({ name: 'User Limit', value: channel.userLimit ? `${channel.userLimit}` : 'Unlimited', inline: true });
            embed.addFields({ name: 'Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true });
        }

        await safeReply(interaction, { embeds: [embed] });
    }
};
