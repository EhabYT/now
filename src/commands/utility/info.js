const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const os = require('os');
const emojis = require('../../utils/emojis');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Display bot information')
    .setDescriptionLocalizations({ de: 'Bot-Informationen anzeigen' }),

  async execute(interaction, client, db) {
    const uptime = client.helpers.formatDuration(client.uptime);
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('' + emojis.robot + ' Bot Information')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: 'Username', value: client.user.username, inline: true },
        { name: 'ID', value: client.user.id, inline: true },
        { name: 'Version', value: '2.1.0', inline: true },
        { name: 'Discord.js', value: `v${version}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'OS', value: `${os.type()} ${os.release()}`, inline: true },
        { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${client.users.cache.size}`, inline: true },
        { name: 'Uptime', value: uptime, inline: true }
      )
      .setTimestamp();

    await safeReply(interaction, { embeds: [embed] });
  }
};
