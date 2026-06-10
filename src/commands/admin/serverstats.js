const emojis = require('../../utils/emojis');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('View server-wide statistics')
    .setDescriptionLocalizations({ de: 'Serverweite Statistiken anzeigen' }),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    if (!interaction.deferred && !interaction.replied) { await interaction.deferReply().catch(() => {}); }
    let members;
    try { members = await interaction.guild.members.fetch(); } catch { members = null; }
    let totalMessages = 0, totalVoice = 0, totalReactions = 0, activeUsers = 0;
    if (members) { for (const [memberId] of members) {
      const stats = await db.get(`stats_${interaction.guild.id}_${memberId}`);
      if (stats) {
        totalMessages += stats.messages || 0; totalVoice += stats.voiceTime || 0;
        totalReactions += stats.reactions || 0;
        if (stats.messages > 0 || stats.voiceTime > 0) activeUsers++;
      }
    } }
    const embed = new EmbedBuilder()
      .setColor('#0099FF').setTitle(`${emojis.progress} ${interaction.guild.name} ${t('bot.stats.statistics', lang)}`)
      .setThumbnail(interaction.guild.iconURL({ size: 128 }))
      .addFields(
        { name: '' + emojis.users + ' ' + t('bot.stats.members', lang), value: `${interaction.guild.memberCount}`, inline: true },
        { name: '' + emojis.progress + ' ' + t('bot.stats.active', lang), value: `${activeUsers}`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '' + emojis.pencil + ' ' + t('bot.stats.messages', lang), value: totalMessages.toLocaleString(), inline: true },
        { name: '' + emojis.voice + ' ' + t('bot.stats.voice', lang), value: `${(totalVoice / 3600000).toFixed(1)}h`, inline: true },
        { name: '' + emojis.heart + ' ' + t('bot.stats.reactions', lang), value: totalReactions.toLocaleString(), inline: true }
      ).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
