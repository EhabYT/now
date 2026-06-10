const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user temporarily or permanently')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('time').setDescription('Duration (1m, 1h, 1d, 1w, 1mo)'))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban')),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const user = interaction.options.getUser('user');
    const timeStr = interaction.options.getString('time');
    const reason = interaction.options.getString('reason') || t('bot.mod.no_reason', lang);
    const { parseTimeString, formatDuration } = client.helpers;

    if (user.id === interaction.user.id) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.mod.self_ban', lang), flags: [MessageFlags.Ephemeral] });
    }
    if (user.id === client.user.id) {
      return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.mod.self_ban_bot', lang), flags: [MessageFlags.Ephemeral] });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.mod.higher_role', lang), flags: [MessageFlags.Ephemeral] });
      }
      if (!member.bannable) {
        return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.mod.cannot_ban', lang), flags: [MessageFlags.Ephemeral] });
      }
    }

    let duration = null;
    if (timeStr) {
      duration = parseTimeString(timeStr);
      if (!duration) {
        return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.mod.invalid_time', lang), flags: [MessageFlags.Ephemeral] });
      }
    }

    try {
      await interaction.guild.members.ban(user, { reason: `${reason} | By: ${interaction.user.username}`, deleteMessageSeconds: 604800 });

      if (duration) {
        const bans = await db.get(`tempbans_${interaction.guild.id}`) || [];
        bans.push({ userId: user.id, moderator: interaction.user.id, reason, expiresAt: Date.now() + duration, bannedAt: Date.now() });
        await db.set(`tempbans_${interaction.guild.id}`, bans);
      }

      const embed = new EmbedBuilder()
        .setColor('#00fbff')
        .setTitle('' + emojis.ban + ' ' + t('bot.mod.banned_title', lang))
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: t('bot.mod.user', lang), value: `${user.username} (${user.id})`, inline: true },
          { name: t('bot.mod.moderator', lang), value: `${interaction.user}`, inline: true },
          { name: t('bot.mod.no_reason', lang), value: reason },
          { name: t('bot.mod.duration', lang), value: duration ? formatDuration(duration) : t('bot.mod.permanent', lang), inline: true }
        )
        .setTimestamp();

      if (duration) {
        embed.addFields({ name: t('bot.mod.expires', lang), value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true });
      }

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: `${emojis.cross} ${t('bot.mod.failed', lang).replace('{error}', err.message)}`, flags: [MessageFlags.Ephemeral] });
    }
  }
};
