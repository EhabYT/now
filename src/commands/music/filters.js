const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filters')
    .setDescription('Apply audio filters')
    .setDescriptionLocalizations({ de: 'Audiofilter anwenden' })
    .addStringOption(opt => opt.setName('filter').setDescription('Filter to toggle').setRequired(true)
      .addChoices(
        { name: 'Bassboost', value: 'bassboost' },
        { name: 'Nightcore', value: 'nightcore' },
        { name: 'Vaporwave', value: 'vaporwave' },
        { name: 'Lofi', value: 'lofi' },
        { name: 'Surround', value: 'surround' },
        { name: '8D', value: '8D' },
        { name: 'Clear All', value: 'clear' }
      )),

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

    const filter = interaction.options.getString('filter');
    if (filter === 'clear') {
      queue.filters.ffmpeg.setFilters(false);
      return await safeReply(interaction, { content: '' + emojis.sparkles + ' ' + t('bot.filter.cleared', lang) });
    }

    await queue.filters.ffmpeg.toggle(filter);
    const enabled = queue.filters.ffmpeg.getFiltersEnabled();
    const isNowActive = enabled.includes(filter);
    await safeReply(interaction, { content: `${emojis.listening} ${tWithVars('bot.filter.toggled', { filter, state: isNowActive ? t('bot.filter.enabled', lang) : t('bot.filter.disabled', lang) }, lang)}` });
  }
};
