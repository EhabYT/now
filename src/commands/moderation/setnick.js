const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnick')
    .setDescription('Change a user\'s nickname')
    .setDescriptionLocalizations({ de: 'Spitznamen eines Benutzers ändern' })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addStringOption(opt => opt.setName('nick').setDescription('New nickname (empty to reset)')),

  async execute(interaction, client, db) {
    const user = interaction.options.getUser('user');
    const nick = interaction.options.getString('nick') || null;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const lang = fromDiscordLocale(interaction.locale, interaction);

    if (!member) return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.setnick.not_found', lang), flags: [MessageFlags.Ephemeral] });
    if (!member.manageable) return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.setnick.cannot_change', lang), flags: [MessageFlags.Ephemeral] });

    try {
      const oldNick = member.nickname || member.user.username;
      await member.setNickname(nick, `Changed by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(emojis.pencil + ' ' + t('bot.setnick.title', lang))
        .addFields(
          { name: t('bot.mod.user', lang), value: user.username, inline: true },
          { name: t('bot.setnick.before', lang), value: oldNick, inline: true },
          { name: t('bot.setnick.after', lang), value: nick || user.username, inline: true }
        )
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.error.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
  }
};
