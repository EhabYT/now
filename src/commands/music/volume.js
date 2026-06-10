const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust the volume')
    .setDescriptionLocalizations({ de: 'Lautstärke anpassen' })
    .addIntegerOption(opt => opt.setName('amount').setDescription('Volume (0-100)').setRequired(true).setMinValue(0).setMaxValue(100)),

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

    const vol = interaction.options.getInteger('amount');
    await queue.node.setVolume(vol);
    await safeReply(interaction, { content: `${emojis.volume} ${tWithVars('bot.music.volume_set', { vol }, lang)}` });
  }
};
