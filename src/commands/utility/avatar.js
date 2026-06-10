const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display user avatar')
    .setDescriptionLocalizations({ de: 'Benutzeravatar anzeigen' })
    .addUserOption(opt => opt.setName('user').setDescription('User')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const url = user.displayAvatarURL({ size: 1024, extension: 'png'
        });
    const embed = new EmbedBuilder().setColor('#0099FF').setTitle(`${user.username
        }'s Avatar`).setImage(url).setTimestamp();
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Download').setStyle(ButtonStyle.Link).setURL(url));
    await safeReply(interaction, { embeds: [embed], components: [row] });
    }
};
