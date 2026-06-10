const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('enlarge')
        .setDescription('Enlarge a custom emoji to full resolution')
        .setDescriptionLocalizations({ de: 'Ein benutzerdefiniertes Emoji in voller Auflösung anzeigen' })
        .addStringOption(opt => opt.setName('emoji').setDescription('Custom emoji to enlarge').setRequired(true)),

    async execute(interaction, client, db) {
        const input = interaction.options.getString('emoji');
        const match = input.match(/<?(a)?:(\w+):(\d{17,20})>?/);

        if (!match) {
            return safeReply(interaction, { content: '' + emojis.cross + ' Please provide a custom emoji (not a default Discord emoji).' });
        }

        const animated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const ext = animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=4096&quality=lossless`;

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.search} Enlarged Emoji — :${name}:`)
            .setImage(url)
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
