const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .setDescriptionLocalizations({ de: 'Eine Umfrage erstellen' })
    .addStringOption(opt => opt.setName('question').setDescription('Question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Options (separated by |)')),

  async execute(interaction, client, db) {
    const question = interaction.options.getString('question');
    const optionsStr = interaction.options.getString('options');
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const embed = new EmbedBuilder().setColor('#0099FF').setTitle(emojis.poll + ' ' + t('bot.poll.title', lang)).setDescription(`**${question
      }**`).setAuthor({
        name: interaction.user.username, iconURL: interaction.user.displayAvatarURL()
      }).setTimestamp();
    if (optionsStr) {
      const options = optionsStr.split('|').map(o => o.trim()).filter(o => o.length > 0);
      if (options.length > 10) return await safeReply(interaction, {
        content: emojis.cross + ' ' + t('bot.poll.max_options', lang), flags: [MessageFlags.Ephemeral]
      });
      const numberEmojis = ['' + emojis.number1 + '', '' + emojis.number2 + '', '' + emojis.number3 + '', '' + emojis.number4 + '', '' + emojis.number5 + '', '' + emojis.number6 + '', '' + emojis.number7 + '', '' + emojis.number8 + '', '' + emojis.number9 + '', '' + emojis.number10 + ''
      ];
      embed.addFields({
        name: t('bot.poll.options_field', lang), value: options.map((o, i) => `${numberEmojis[i]
          } ${o
          }`).join('\n')
      });
      const message = await safeReply(interaction, {
        embeds: [embed], fetchReply: true
      });
      for (let i = 0; i < options.length; i++) await message.react(numberEmojis[i
      ]);
    } else {
      const message = await safeReply(interaction, {
        embeds: [embed], fetchReply: true
      });
      await message.react('' + emojis.check + ''); await message.react('' + emojis.cross + '');
    }
  }
};
