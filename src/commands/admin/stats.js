const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View user statistics')
    .setDescriptionLocalizations({ de: 'Benutzerstatistiken anzeigen' })
    .addUserOption(opt => opt.setName('user').setDescription('User')),

  async execute(interaction, client, db) {
    const user = interaction.options.getUser('user') || interaction.user;
    const stats = await db.get(`stats_${interaction.guild.id}_${user.id}`) || { messages: 0, voiceTime: 0, reactions: 0 };
    const voiceHours = (stats.voiceTime / (1000 * 60 * 60)).toFixed(2);
    const total = stats.messages + Math.floor(stats.voiceTime / 60000) + stats.reactions;

    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle(`${emojis.growth} Statistics for ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '' + emojis.pencil + ' Messages', value: `${stats.messages.toLocaleString()}`, inline: true },
        { name: '' + emojis.voice + ' Voice Time', value: `${voiceHours}h`, inline: true },
        { name: '' + emojis.heart + ' Reactions', value: `${stats.reactions.toLocaleString()}`, inline: true },
        { name: '' + emojis.trophy + ' Total Points', value: `${total.toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    await safeReply(interaction, { embeds: [embed] });
  }
};
