const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current music queue')
        .setDescriptionLocalizations({
            de: 'Aktuelle Musikwarteschlange anzeigen'
        }),

    async execute(interaction, client, db) {
        const queue = useQueue(interaction.guild.id);
        const lang = fromDiscordLocale(interaction.locale, interaction);

        if (!queue || (!queue.isPlaying() && !queue.tracks.size)) {
            return await safeReply(interaction, {
                content: '' + emojis.cross + ' ' + t('bot.music.queue_empty', lang), flags: [MessageFlags.Ephemeral]
            });
        }

        const tracks = queue.tracks.toArray().slice(0, 10);
        const desc = tracks.map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) — ${t.duration}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor('#00fbff') // Neon Blue
            .setTitle('' + emojis.music + ' ' + t('bot.music.queue_title', lang))
            .setDescription(`**${t('bot.music.now_playing_label', lang)}:** [${queue.currentTrack.title}](${queue.currentTrack.url})\n\n**${t('bot.music.next_up', lang)}:**\n${desc || '_' + t('bot.music.no_more_songs', lang) + '_'}`)
            .setFooter({
                text: tWithVars('bot.music.songs_count', { count: queue.tracks.size }, lang)
            })
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
