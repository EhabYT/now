const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .setDescriptionLocalizations({ de: 'Einen Benutzer vom Server kicken' })
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || t('bot.mod.no_reason', lang);

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return await safeReply(interaction, {
        content: '' + emojis.cross + ' ' + t('bot.mod.user_not_found', lang), flags: [MessageFlags.Ephemeral]
      });
    }

    if (user.id === interaction.user.id) {
      return await safeReply(interaction, {
        content: '' + emojis.cross + ' ' + t('bot.mod.self_kick', lang), flags: [MessageFlags.Ephemeral]
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return await safeReply(interaction, {
        content: '' + emojis.cross + ' ' + t('bot.mod.higher_role', lang), flags: [MessageFlags.Ephemeral]
      });
    }

    if (!member.kickable) {
      return await safeReply(interaction, {
        content: '' + emojis.cross + ' ' + t('bot.mod.cannot_kick', lang), flags: [MessageFlags.Ephemeral]
      });
    }

    try {
      await member.kick(`${reason} | By: ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#00fbff')
        .setTitle('' + emojis.kick + ' ' + t('bot.mod.kicked_title', lang))
        .setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: t('bot.mod.user', lang), value: `${user.username} (${user.id})`, inline: true },
          { name: t('bot.mod.moderator', lang), value: `${interaction.user}`, inline: true },
          { name: t('bot.mod.no_reason', lang), value: reason }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, {
        content: `${emojis.cross} ${tWithVars('bot.mod.failed_kick', { error: err.message }, lang)}`, flags: [MessageFlags.Ephemeral]
      });
    }
  }
};
