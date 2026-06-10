const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user')
    .setDescriptionLocalizations({ de: 'Benutzer entbannen' })
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('id').setDescription('User ID').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const userId = interaction.options.getString('id');
    const reason = interaction.options.getString('reason') || t('bot.mod.no_reason', lang);

    try {
      await interaction.guild.members.unban(userId, `${reason} | By: ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#00fbff')
        .setTitle(emojis.unlock + ' ' + t('bot.mod.unbanned_title', lang))
        .setDescription(t('bot.mod.unbanned_success', lang).replace('{id}', `\`${userId}\``))
        .addFields({ name: 'Reason', value: reason })
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: `${emojis.cross} ${tWithVars('bot.error.failed', { error: err.message }, lang)}`, flags: [MessageFlags.Ephemeral] });
    }
  }
};
