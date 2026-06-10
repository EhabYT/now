const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the bots current ping')
    .setDescriptionLocalizations({
      de: 'Antwortet mit dem aktuellen Ping des Bots',
      'en-US': 'Replies with the bots current ping'
    }),

  async execute(interaction, client, db) {
    const lang = fromDiscordLocale(interaction.locale, interaction);
    const reply = await safeReply(interaction, { content: '' + emojis.bridge + ' Pinging...', fetchReply: true });
    const latency = reply.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor('#00fbff')
      .setTitle(`${emojis.pingPong} Pong!`)
      .addFields(
        { name: '' + emojis.robot + ' Bot Latency', value: `\`${latency}ms\``, inline: true },
        { name: '' + emojis.bridge + ' API Latency', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true }
      )
      .setFooter({ text: tWithVars('bot.ping.response', { ping: latency, api: Math.round(client.ws.ping) }, lang) })
      .setTimestamp();

    await safeReply(interaction, { content: null, embeds: [embed] });
  }
};
