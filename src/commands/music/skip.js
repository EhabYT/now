const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song')
    .setDescriptionLocalizations({ de: 'Aktuellen Titel überspringen' }),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.no_playing', lang), flags: [MessageFlags.Ephemeral] });
    }

    const isDJ = await checkDJPerms(interaction, db);
    if (!isDJ) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.dj_required', lang), flags: [MessageFlags.Ephemeral] });
    }

    const currentTrack = queue.currentTrack;
    await queue.node.skip();
    await safeReply(interaction, { content: `${emojis.skip} ${tWithVars('bot.music.skipped', { track: currentTrack.title }, lang)}` });
  }
};
