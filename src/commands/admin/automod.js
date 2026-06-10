const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure AutoMod settings')
    .setDescriptionLocalizations({ de: 'AutoMod-Einstellungen konfigurieren' })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt => opt.setName('feature')
      .setDescription('AutoMod feature')
      .setRequired(true)
      .addChoices(
        { name: 'Spam Detection', value: 'antiSpam' },
        { name: 'Profanity Filter', value: 'badWords' },
        { name: 'Link Protection', value: 'antiLinks' },
        { name: 'CAPS Detection', value: 'caps' },
        { name: 'Emoji Spam', value: 'emojis' },
        { name: 'Mention Spam', value: 'mentions' }
      ))
    .addStringOption(opt => opt.setName('action')
      .setDescription('Action to perform')
      .setRequired(true)
      .addChoices(
        { name: 'Enable', value: 'enable' },
        { name: 'Disable', value: 'disable' },
        { name: 'Status', value: 'status' }
      ))
    .addIntegerOption(opt => opt.setName('threshold')
      .setDescription('Threshold value')
      .setMinValue(1)
      .setMaxValue(100)),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const feature = interaction.options.getString('feature');
    const action = interaction.options.getString('action');
    const threshold = interaction.options.getInteger('threshold');
    const config = await db.get(`automod_${interaction.guild.id}`) || {};
    const featureName = feature.charAt(0).toUpperCase() + feature.slice(1);

    if (action === 'status') {
      const featureConfig = config[feature] || { enabled: false };
      const embed = new EmbedBuilder()
        .setColor(featureConfig.enabled ? '#2ed573' : '#ff4757')
        .setTitle(`${emojis.shield} ${t('bot.automod.status', lang)}: ${featureName}`)
        .addFields(
          { name: t('bot.automod.status', lang), value: featureConfig.enabled ? '' + emojis.check + ' ' + t('bot.automod.enabled_status', lang) : '' + emojis.cross + ' ' + t('bot.automod.disabled_status', lang), inline: true },
          { name: t('bot.automod.threshold', lang), value: `${featureConfig.threshold || t('bot.automod.default', lang)}`, inline: true }
        )
        .setTimestamp();
      return await safeReply(interaction, { embeds: [embed] });
    }

    if (action === 'enable') {
      const defaults = { antiSpam: 5, badWords: null, antiLinks: 3, caps: 70, emojis: 10, mentions: 5 };
      config[feature] = {
        enabled: true,
        threshold: threshold || config[feature]?.threshold || defaults[feature]
      };
      await db.set(`automod_${interaction.guild.id}`, config);
      const embed = new EmbedBuilder()
        .setColor('#2ed573')
        .setTitle('' + emojis.check + ' ' + t('bot.automod.enabled', lang))
        .setDescription(tWithVars('bot.automod.protection_active', { feature: featureName }, lang))
        .addFields({ name: t('bot.automod.threshold', lang), value: `${config[feature].threshold || 'N/A'}`, inline: true })
        .setTimestamp();
      return await safeReply(interaction, { embeds: [embed] });
    }

    if (action === 'disable') {
      if (config[feature]) {
        config[feature].enabled = false;
        await db.set(`automod_${interaction.guild.id}`, config);
      }
      const embed = new EmbedBuilder()
        .setColor('#ff4757')
        .setTitle('' + emojis.cross + ' ' + t('bot.automod.disabled_title', lang))
        .setDescription(tWithVars('bot.automod.protection_deactivated', { feature: featureName }, lang))
        .setTimestamp();
      return await safeReply(interaction, { embeds: [embed] });
    }
  }
};
