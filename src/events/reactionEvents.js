const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = [
    {
        name: Events.MessageReactionAdd,
        async execute(reaction, user, client) {
            if (!user || user.bot || !reaction || !reaction.message || !reaction.message.guild) return;
            const db = client?.db || reaction.message.client?.db;
            if (!db) return;
            try {
                const guildId = reaction.message.guild.id;
                await db.add(`stats_${guildId}_${user.id}.reactions`, 1);
            } catch (err) {
                logger.debug('ReactionAdd stats error', { error: err.message });
            }
        }
    },
    {
        name: Events.MessageReactionRemove,
        async execute(reaction, user, client) {
            if (!user || user.bot || !reaction || !reaction.message || !reaction.message.guild) return;
            const db = client?.db || reaction.message.client?.db;
            if (!db) return;
            try {
                const guildId = reaction.message.guild.id;
                await db.add(`stats_${guildId}_${user.id}.reactions`, -1);
            } catch (err) {
                logger.debug('ReactionRemove stats error', { error: err.message });
            }
        }
    }
];
