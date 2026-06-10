const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a user')
    .setDescriptionLocalizations({ de: 'Auszeit eines Benutzers aufheben' })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction, client, db) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const lang = fromDiscordLocale(interaction.locale, interaction);

    if (!member) {
      return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.error.not_found', lang), flags: [MessageFlags.Ephemeral] });
    }
    if (!member.isCommunicationDisabled()) {
      return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.untimeout.not_timed_out', lang), flags: [MessageFlags.Ephemeral] });
    }

    try {
      await member.timeout(null, `Timeout removed by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#00fbff')
        .setTitle(emojis.volume + ' ' + t('bot.untimeout.title', lang))
        .addFields(
          { name: t('bot.mod.user', lang), value: user.username, inline: true },
          { name: t('bot.mod.moderator', lang), value: `${interaction.user}`, inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.error.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
    }
  }
};
