const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .setDescriptionLocalizations({
      de: 'Benutzer eine Auszeit geben'
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to timeout').setDescriptionLocalizations({
      de: 'Benutzer für Auszeit'
    }).setRequired(true))
    .addStringOption(opt => opt.setName('time').setDescription('Duration (1m, 1h, 1d, 1w)').setDescriptionLocalizations({
      de: 'Dauer (1m, 1h, 1d, 1w)'
    }).setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setDescriptionLocalizations({
      de: 'Grund'
    })),

  async execute(interaction, client, db) {
    const user = interaction.options.getUser('user');
    const timeStr = interaction.options.getString('time');
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const reason = interaction.options.getString('reason') || t('bot.mod.no_reason', lang);
    const duration = client.helpers.parseTimeString(timeStr);

    if (!duration) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.error.invalid_duration', lang), flags: [MessageFlags.Ephemeral] });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.mod.user_not_found', lang), flags: [MessageFlags.Ephemeral] });
    }

    try {
      await member.timeout(duration, `${reason} | By: ${interaction.user.username}`);
      const embed = new EmbedBuilder()
        .setColor('#00fbff') // Neon Blue
        .setTitle('' + emojis.timeout + ' ' + t('bot.mod.timed_out_title', lang))
        .addFields(
          { name: t('bot.mod.user', lang), value: `${user.username}`, inline: true },
          { name: t('bot.mod.duration', lang), value: client.helpers.formatDuration(duration), inline: true },
          { name: t('bot.mod.reason', lang), value: reason }
        ).setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: `${emojis.cross} ${tWithVars('bot.error.failed', { error: err.message }, lang)}`, flags: [MessageFlags.Ephemeral] });
    }
  }
};
