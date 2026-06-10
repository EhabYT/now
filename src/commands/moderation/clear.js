const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages')
    .setDescriptionLocalizations({
      de: 'Nachrichten löschen'
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages').setDescriptionLocalizations({
      de: 'Anzahl der Nachrichten'
    }).setRequired(true).setMinValue(1).setMaxValue(100))
    .addStringOption(opt => opt.setName('target').setDescription('Filter: "bots" or @user').setDescriptionLocalizations({
      de: 'Filter: "bots" oder @user'
    })),

  async execute(interaction, client, db) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getString('target');
    const lang = fromDiscordLocale(interaction.locale, interaction);

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }

    try {
      let messages = await interaction.channel.messages.fetch({ limit: amount });
      if (target) {
        if (target.toLowerCase() === 'bots') {
          messages = messages.filter(m => m.author.bot);
        } else {
          const userMatch = target.match(/(\d{17,20})/);
          if (userMatch) messages = messages.filter(m => m.author.id === userMatch[1]);
        }
      }

      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

      if (messages.size === 0) {
        return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.clear.no_messages', lang) });
      }

      const deleted = await interaction.channel.bulkDelete(messages, true);

      const embed = new EmbedBuilder()
        .setColor('#00fbff') // Neon Blue
        .setTitle('' + emojis.trash + ' ' + t('bot.clear.deleted', lang))
        .setDescription(tWithVars('bot.clear.success', { count: deleted.size }, lang))
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: `${emojis.cross} ${tWithVars('bot.error.failed', { error: err.message }, lang)}` });
    }
  }
};
