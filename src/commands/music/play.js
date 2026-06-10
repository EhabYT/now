const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { QueryType } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(opt => opt.setName('query').setDescription('Song name or URL').setRequired(true)),
  defer: true,

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const player = client.player;
    const query = interaction.options.getString('query');

    if (!interaction.member.voice.channel) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.need_voice', lang), flags: [MessageFlags.Ephemeral] });
    }

    const isDJ = await checkDJPerms(interaction, db);
    if (!isDJ) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.dj_required', lang), flags: [MessageFlags.Ephemeral] });
    }

    try {
      const { track } = await player.play(interaction.member.voice.channel, query, {
        searchEngine: QueryType.AUTO,
        nodeOptions: {
          metadata: { channel: interaction.channel },
          selfDeaf: true,
          volume: 50,
          leaveOnEmpty: true,
          leaveOnEnd: false
        }
      });

      const embed = new EmbedBuilder()
        .setColor('#00fbff')
        .setTitle('' + emojis.music + ' ' + t('bot.music.added_title', lang))
        .setDescription(`**[${track.title}](${track.url})**`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: t('bot.music.duration', lang), value: track.duration, inline: true },
          { name: t('bot.music.requested_by', lang), value: interaction.user.toString(), inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      logger.error('Play command failed', { error: err.message, query });
      const msg = err.message.includes('No results') ? t('bot.music.no_results', lang) : err.message;
      await safeReply(interaction, { content: `${emojis.cross} ${msg}` });
    }
  }
};
