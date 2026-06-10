const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display user information')
    .setDescriptionLocalizations({ de: 'Benutzerinformationen anzeigen' })
    .addUserOption(opt => opt.setName('user').setDescription('User')),

  async execute(interaction, client, db) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor || '#0099FF')
      .setTitle(`${emojis.users} User Info: ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      );

    if (member) {
      embed.addFields(
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Highest Role', value: `${member.roles.highest}`, inline: true },
        { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.filter(r => r.name !== '@everyone').map(r => `${r}`).join(', ').slice(0, 1024) : 'None' }
      );
    }

    await safeReply(interaction, { embeds: [embed] });
  }
};
