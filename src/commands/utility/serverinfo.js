const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const emojis = require('../../utils/emojis');
const { safeReply } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display server information')
        .setDescriptionLocalizations({ de: 'Serverinformationen anzeigen' }),

    async execute(interaction, client, db) {
        const { guild } = interaction;
        let owner;
        try { owner = await guild.fetchOwner(); } catch { owner = null; }
        const channels = guild.channels.cache;
        const roles = guild.roles.cache;
        const guildEmojis = guild.emojis.cache;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`${emojis.server} Server Info: ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 1024 }))
            .addFields(
                { name: 'Owner', value: `${owner}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'ID', value: guild.id, inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Roles', value: `${roles.size}`, inline: true },
                { name: 'Emojis', value: `${guildEmojis.size}`, inline: true },
                { name: 'Channels', value: `${emojis.message} Text: ${channels.filter(c => c.type === ChannelType.GuildText).size}\n${emojis.volume} Voice: ${channels.filter(c => c.type === ChannelType.GuildVoice).size}\n${emojis.folder} Categories: ${channels.filter(c => c.type === ChannelType.GuildCategory).size}` }
            )
            .setTimestamp();

        if (guild.bannerURL()) embed.setImage(guild.bannerURL());
        await safeReply(interaction, { embeds: [embed] });
    }
};
