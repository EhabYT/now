const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current song')
    .setDescriptionLocalizations({ de: 'Aktuellen Titel fortsetzen' }),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.node.isPaused()) {
      return await safeReply(interaction, {
        content: '' + emojis.cross + ' ' + t('bot.music.not_paused', lang), flags: [MessageFlags.Ephemeral]
      });
    }

    const isDJ = await checkDJPerms(interaction, db);
    if (!isDJ) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.dj_required', lang), flags: [MessageFlags.Ephemeral] });
    }

    queue.node.setPaused(false);
    await safeReply(interaction, { content: '' + emojis.playing + ' ' + t('bot.music.resumed', lang) });
  }
};
