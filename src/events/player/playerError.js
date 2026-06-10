const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../utils/config');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'playerError',
    async execute(queue, error) {
        logger.error('Player track error', {
            error: error.message,
            guild: queue && queue.guild ? queue.guild.name : undefined
        });

        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${emojis.cross} Error playing track: ${error.message}`)
            .setTimestamp();

        if (queue.metadata && queue.metadata.channel) {
            await queue.metadata.channel.send({ embeds: [embed] }).catch(() => { });
        }
    }
};
