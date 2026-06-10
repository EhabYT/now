const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give reputation to a user')
    .setDescriptionLocalizations({ de: 'Einem Benutzer Bewertung geben' })
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const user = interaction.options.getUser('user');
    if (user.id === interaction.user.id) return await safeReply(interaction, {
      content: emojis.cross + ' ' + t('bot.rep.self', lang), flags: [MessageFlags.Ephemeral]
    });
    const cooldownKey = `rep_cooldown_${interaction.guild.id
      }_${interaction.user.id}`;
    const lastRep = await db.get(cooldownKey);
    const now = Date.now();
    if (lastRep && now - lastRep < 86400000) {
      const remaining = 86400000 - (now - lastRep);
      return await safeReply(interaction, {
        content: `${emojis.cross} ${tWithVars('bot.rep.cooldown', { hours: Math.floor(remaining / 3600000), minutes: Math.floor((remaining % 3600000) / 60000) }, lang)}`, flags: [MessageFlags.Ephemeral]
      });
    }
    const repKey = `rep_${interaction.guild.id
      }_${user.id}`;
    const currentRep = await db.add(repKey, 1);
    await db.set(cooldownKey, now);
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle(emojis.star + ' ' + t('bot.rep.given', lang))
      .setDescription(tWithVars('bot.rep.desc', { author: interaction.user, target: user, targetName: user.username, count: currentRep + 1 }, lang)).setTimestamp();
    await safeReply(interaction, {
      embeds: [embed]
    });
  }
};
