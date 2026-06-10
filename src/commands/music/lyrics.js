const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue, useMainPlayer } = require('discord-player');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get lyrics for a song')
    .setDescriptionLocalizations({ de: 'Songtext für ein Lied abrufen' })
    .addStringOption(opt => opt.setName('query').setDescription('Song name')),
  defer: true,

  async execute(interaction, client, db) {
    const queue = useQueue(interaction.guild.id);
    const query = interaction.options.getString('query') || queue?.currentTrack?.title;
    const lang = fromDiscordLocale(interaction.locale, interaction);

    if (!query) {
      return await safeReply(interaction, {
        content: emojis.cross + ' ' + t('bot.lyrics.no_query', lang),
        flags: [MessageFlags.Ephemeral]
      });
    }

    const player = useMainPlayer();
    try {
      const results = await player.lyrics.search({ q: query });
      const lyrics = results?.[0];

      if (!lyrics) {
        return await safeReply(interaction, {
          content: emojis.cross + ' ' + tWithVars('bot.lyrics.not_found', { title: query }, lang)
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#00fbff')
        .setTitle(emojis.music + ' ' + tWithVars('bot.lyrics.title', { title: lyrics.title }, lang))
        .setAuthor({ name: lyrics.artist?.name || lyrics.artist || 'Unknown' })
        .setDescription(lyrics.plainLyrics.slice(0, 4000))
        .setFooter({ text: t('bot.lyrics.powered_by', lang) })
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.lyrics.error', lang) });
    }
  }
};
