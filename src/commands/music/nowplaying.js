const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('View details of the current song')
    .setDescriptionLocalizations({ de: 'Details des aktuellen Titels anzeigen' }),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.currentTrack) {
      return await safeReply(interaction, {
        content: '' + emojis.cross + ' ' + t('bot.music.no_playing', lang), flags: [MessageFlags.Ephemeral]
      });
    }

    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar();

    const embed = new EmbedBuilder()
      .setColor('#00fbff')
      .setTitle('' + emojis.music + ' ' + t('bot.music.now_playing', lang))
      .setDescription(`**[${track.title}](${track.url})**\nby ${track.author}`)
      .setThumbnail(track.thumbnail)
      .addFields({ name: t('bot.music.progress', lang), value: progress || '_' + t('bot.music.not_available', lang) + '_' })
      .setTimestamp();

    await safeReply(interaction, { embeds: [embed] });
  }
};
