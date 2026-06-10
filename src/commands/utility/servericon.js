const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('servericon')
        .setDescription('Get the server icon')
        .setDescriptionLocalizations({ de: 'Server-Icon anzeigen' }),

    async execute(interaction, client, db) {
        const guild = interaction.guild;
        const icon = guild.iconURL({ size: 4096, dynamic: true });

        if (!icon) {
            return safeReply(interaction, { content: '' + emojis.cross + ' This server has no icon.' });
        }

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.server} ${guild.name}'s Icon`)
            .setImage(icon)
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
