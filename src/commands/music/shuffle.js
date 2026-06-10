const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the queue')
    .setDescriptionLocalizations({
      de: 'Warteschlange mischen'
    }),

  async execute(interaction, client, db) {
    const queue = useQueue(interaction.guild.id);
    const lang = fromDiscordLocale(interaction.locale, interaction);

    if (!queue || queue.tracks.size < 2) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.not_enough', lang), flags: [MessageFlags.Ephemeral] });
    }

    // DJ Check
    const isDJ = await checkDJPerms(interaction, db);
    if (!isDJ) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.dj_required', lang), flags: [MessageFlags.Ephemeral] });
    }

    queue.tracks.shuffle();
    await safeReply(interaction, { content: '' + emojis.shuffle + ' ' + t('bot.music.shuffled', lang) });
  }
};
