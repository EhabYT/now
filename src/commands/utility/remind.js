const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .setDescriptionLocalizations({ de: 'Eine Erinnerung einstellen' })
    .addStringOption(opt => opt.setName('time').setDescription('Time (1h, 1d, etc.)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('What to remind you about').setRequired(true)),

  async execute(interaction, client, db) {
    const timeStr = interaction.options.getString('time');
    const reason = interaction.options.getString('reason');
    const duration = client.helpers.parseTimeString(timeStr);
    const lang = fromDiscordLocale(interaction.locale, interaction);
    if (!duration) return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.remind.invalid_time', lang), flags: [MessageFlags.Ephemeral] });
    const expiresAt = Date.now() + duration;
    const reminders = await db.get(`reminders_${interaction.user.id}`) || [];
    reminders.push({ channelId: interaction.channel.id, reason, expiresAt });
    await db.set(`reminders_${interaction.user.id}`, reminders);
    const embed = new EmbedBuilder().setColor('#00FF00').setTitle(emojis.clock + ' ' + t('bot.remind.set_title', lang))
      .setDescription(tWithVars('bot.remind.desc', { reason, clock: emojis.clock, time: `<t:${Math.floor(expiresAt / 1000)}:R>` }, lang)).setTimestamp();
    await safeReply(interaction, { embeds: [embed] });
  }
};
