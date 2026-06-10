const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('emojis')
        .setDescription('List all emojis in this server')
        .setDescriptionLocalizations({ de: 'Alle Emojis auf diesem Server auflisten' }),

    async execute(interaction, client, db) {
        const emojisList = interaction.guild.emojis.cache;

        if (emojisList.size === 0) {
            return safeReply(interaction, { content: '' + emojis.cross + ' This server has no custom emojis.' });
        }

        const animated = emojisList.filter(e => e.animated).map(e => e.toString()).join(' ') || 'None';
        const static = emojisList.filter(e => !e.animated).map(e => e.toString()).join(' ') || 'None';

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.grinning} Server Emojis (${emojisList.size})`)
            .addFields(
                { name: 'Static', value: static.length > 1024 ? static.substring(0, 1020) + '...' : static, inline: false },
                { name: 'Animated', value: animated.length > 1024 ? animated.substring(0, 1020) + '...' : animated, inline: false }
            )
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
