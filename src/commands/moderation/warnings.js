const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .setDescriptionLocalizations({ de: 'Verwarnungen eines Benutzers anzeigen' })
    .addUserOption(opt => opt.setName('user').setDescription('User')),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const user = interaction.options.getUser('user') || interaction.user;
    const key = `warnings_${interaction.guild.id}_${user.id}`;
    const warnings = await db.get(key) || [];

    if (warnings.length === 0) {
      return await safeReply(interaction, { content: `${emojis.check} ${tWithVars('bot.mod.no_warnings', { user: user.username }, lang)}`, flags: [MessageFlags.Ephemeral] });
    }

    const embed = new EmbedBuilder()
      .setColor('#00fbff')
      .setTitle(`${emojis.warning} ${tWithVars('bot.stats.title', { user: user.username }, lang)}`)
      .setDescription(`Total: ${warnings.length} warning(s)`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    for (const warn of warnings.slice(-10)) {
      embed.addFields({
        name: `ID: ${warn.id}`,
        value: `**Reason:** ${warn.reason}\n**Moderator:** <@${warn.moderator}>\n**Date:** <t:${Math.floor(warn.timestamp / 1000)}:R>`
      });
    }

    if (warnings.length > 10) {
      embed.setFooter({ text: `Showing latest 10 of ${warnings.length}` });
    }

    await safeReply(interaction, { embeds: [embed] });
  }
};
