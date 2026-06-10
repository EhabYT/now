const { EmbedBuilder } = require('discord.js');
const config = require('../../utils/config');
const emojis = require('../../utils/emojis');

module.exports = {
    name: 'emptyChannel',
    async execute(queue) {
        const db = queue.player.client.db;
        const is247 = await db.get(`247_${queue.guild.id}`);
        if (is247) return;

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setDescription('' + emojis.timeout + ' **Voice channel is empty.** Leaving in 30 seconds to save resources...')
            .setTimestamp();

        if (queue.metadata && queue.metadata.channel) {
            await queue.metadata.channel.send({ embeds: [embed] }).catch(() => { });
        }
    }
};
