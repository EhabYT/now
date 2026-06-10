const { EmbedBuilder } = require('discord.js');
const config = require('../../utils/config');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'playerStart',
    async execute(queue, track) {
        const sourceIcon = track.url?.includes('spotify') ? '' + emojis.online + '' : '' + emojis.dnd + '';
        const sourceName = track.url?.includes('spotify') ? 'Spotify' : 'YouTube';

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('' + emojis.music + ' Now Playing')
            .setDescription(`[${track.title}](${track.url})`)
            .setThumbnail(track.thumbnail)
            .addFields(
                { name: '' + emojis.stopwatch + ' Duration', value: track.duration, inline: true },
                { name: '' + emojis.voice + ' Artist', value: track.author || 'Unknown', inline: true },
                { name: '' + emojis.invite + ' Requested by', value: String(track.requestedBy), inline: true },
                { name: '' + emojis.bridge + ' Source', value: `${sourceIcon} ${sourceName}`, inline: true }
            )
            .setTimestamp();

        if (queue.metadata && queue.metadata.channel) {
            await queue.metadata.channel.send({ embeds: [embed] }).catch(() => { });
        }
    }
};
