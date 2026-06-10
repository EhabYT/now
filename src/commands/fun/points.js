const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('View or manage points')
    .setDescriptionLocalizations({ de: 'Punkte anzeigen oder verwalten' })
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addStringOption(opt => opt.setName('value').setDescription('+10, -5, or reset (mod only)')),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const user = interaction.options.getUser('user');
    const value = interaction.options.getString('value');
    const key = `points_${interaction.guild.id}_${user.id}`;
    if (value) {
      if (!client.helpers.hasModPerms(interaction.member)) return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.points.mods_only', lang), flags: [MessageFlags.Ephemeral] });
      if (value.toLowerCase() === 'reset') { await db.set(key, 0); return await safeReply(interaction, { embeds: [new EmbedBuilder().setColor('#FFA500').setDescription(`${emojis.refresh} ${tWithVars('bot.points.reset', { user }, lang)}`).setTimestamp()] }); }
      const change = parseInt(value);
      if (isNaN(change)) return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.points.invalid', lang), flags: [MessageFlags.Ephemeral] });
      const current = (await db.get(key)) || 0;
      await db.set(key, current + change);
      const embed = new EmbedBuilder().setColor('#0099FF').setTitle(emojis.progress + ' ' + t('bot.points.updated', lang))
        .addFields({ name: 'User', value: `${user}`, inline: true }, { name: 'Change', value: `${change > 0 ? '+' : ''}${change}`, inline: true }, { name: 'Total', value: `${current + change}`, inline: true }).setTimestamp();
      return await safeReply(interaction, { embeds: [embed] });
    }
    const points = (await db.get(key)) || 0;
    await safeReply(interaction, { embeds: [new EmbedBuilder().setColor('#0099FF').setTitle(`${emojis.progress} ${user.username}`).setDescription(tWithVars('bot.points.display', { user: user.username, points }, lang)).setTimestamp()] });
  }
};
