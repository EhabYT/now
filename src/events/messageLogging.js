const { Events, EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const emojis = require('../utils/emojis');

module.exports = [
    {
        name: Events.MessageDelete,
        async execute(message, client) {
            if (!message.guild || (message.author && message.author.bot)) return;
            const db = client.db;
            const cfg = await db.get(`logging_${message.guild.id}`) || {};
            if (!cfg.messages) return;

            const ch = await message.guild.channels.fetch(cfg.messages).catch(() => null);
            if (!ch) return;

            const authorTag = message.author ? message.author.username : 'Unknown';
            const authorId = message.author ? message.author.id : 'N/A';

            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('' + emojis.cross + ' Message Deleted')
                .addFields(
                    { name: 'Author', value: `${authorTag} (${authorId})`, inline: true },
                    { name: 'Channel', value: String(message.channel), inline: true },
                    { name: 'Content', value: message.content ? message.content.slice(0, 1024) : '[No content]' }
                )
                .setTimestamp();

            await ch.send({ embeds: [embed] }).catch(() => {});
        }
    },
    {
        name: Events.MessageUpdate,
        async execute(oldMsg, newMsg, client) {
            if (!oldMsg.guild || (oldMsg.author && oldMsg.author.bot) || oldMsg.content === newMsg.content) return;
            const db = client.db;
            const cfg = await db.get(`logging_${oldMsg.guild.id}`) || {};
            if (!cfg.messages) return;

            const ch = await oldMsg.guild.channels.fetch(cfg.messages).catch(() => null);
            if (!ch) return;

            const authorName = oldMsg.author ? oldMsg.author.username : 'Unknown';
            const embed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('' + emojis.pencil + ' Message Edited')
                .addFields(
                    { name: 'Author', value: `${authorName} (${oldMsg.author?.id || 'N/A'})`, inline: true },
                    { name: 'Channel', value: String(oldMsg.channel), inline: true },
                    { name: 'Before', value: oldMsg.content ? oldMsg.content.slice(0, 1024) : '[No content]' },
                    { name: 'After', value: newMsg.content ? newMsg.content.slice(0, 1024) : '[No content]' }
                )
                .setTimestamp();

            await ch.send({ embeds: [embed] }).catch(() => {});
        }
    }
];

