const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .setDescriptionLocalizations({
      de: 'Wiederholungsmodus einstellen'
    })
    .addIntegerOption(opt => opt.setName('mode').setDescription('Loop mode').setDescriptionLocalizations({
      de: 'Wiederholungsmodus'
    }).setRequired(true)
      .addChoices(
        { name: 'Off', value: QueueRepeatMode.OFF },
        { name: 'Track', value: QueueRepeatMode.TRACK },
        { name: 'Queue', value: QueueRepeatMode.QUEUE },
        { name: 'Autoplay', value: QueueRepeatMode.AUTOPLAY }
      )),

  async execute(interaction, client, db) {
    const queue = useQueue(interaction.guild.id);
    const lang = fromDiscordLocale(interaction.locale, interaction);

    if (!queue || !queue.isPlaying()) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.no_playing', lang), flags: [MessageFlags.Ephemeral] });
    }

    // DJ Check
    const isDJ = await checkDJPerms(interaction, db);
    if (!isDJ) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.music.dj_required', lang), flags: [MessageFlags.Ephemeral] });
    }

    const mode = interaction.options.getInteger('mode');
    await queue.setRepeatMode(mode);

    const modeNames = ['Off', 'Track', 'Queue', 'Autoplay'];
    await safeReply(interaction, { content: `${emojis.repeat} ${tWithVars('bot.music.loop_set', { mode: modeNames[mode] }, lang)}` });
  }
};
