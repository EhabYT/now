const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');

function registerJobs(client, scheduler) {
    const db = client.db;

    // Timed Bans Job
    scheduler.addJob('timed-bans', 60000, async () => {
        for (const [guildId, guild] of client.guilds.cache) {
            const bans = await db.get(`tempbans_${guildId}`) || [];
            const now = Date.now();
            const remainingBans = [];

            for (const ban of bans) {
                if (now >= ban.expiresAt) {
                    try {
                        await guild.members.unban(ban.userId, 'Tempban expired');
                        logger.info(`Auto-unbanned ${ban.userId} from ${guild.name}`);
                    } catch (err) {
                        logger.error(`Auto-unban fail: ${ban.userId}`, { error: err.message });
                    }
                } else {
                    remainingBans.push(ban);
                }
            }

            if (remainingBans.length !== bans.length) {
                await db.set(`tempbans_${guildId}`, remainingBans);
            }
        }
    });

    // Giveaways Job
    scheduler.addJob('giveaways', 10000, async () => {
        for (const [guildId, guild] of client.guilds.cache) {
            const giveaways = await db.get(`giveaways_${guildId}`) || [];
            const now = Date.now();
            const updatedGiveaways = [];
            let changed = false;

            for (const giveaway of giveaways) {
                if (!giveaway.active) {
                    updatedGiveaways.push(giveaway);
                    continue;
                }

                if (now >= giveaway.endsAt) {
                    try {
                        const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
                        if (!channel) {
                            giveaway.active = false;
                            updatedGiveaways.push(giveaway);
                            changed = true;
                            continue;
                        }

                        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                        if (!message) {
                            giveaway.active = false;
                            updatedGiveaways.push(giveaway);
                            changed = true;
                            continue;
                        }

                        const giftEmoji = '' + emojis.gift + '';
                        const reaction = message.reactions.cache.find(r => r.emoji.name === giftEmoji || r.emoji.id === giftEmoji.match(/\d+/)?.[0]);
                        let userList = [];
                        if (reaction) {
                            const users = await reaction.users.fetch();
                            userList = users.filter(u => !u.bot).map(u => u.id);
                        }

                        let winners = [];
                        if (userList.length > 0) {
                            // Shuffling
                            const shuffled = userList.sort(() => Math.random() - 0.5);
                            winners = shuffled.slice(0, Math.min(giveaway.winners || 1, shuffled.length));
                        }

                        const embed = EmbedBuilder.from(message.embeds[0])
                            .setColor('#FF0000')
                            .setTitle(' GIVEAWAY ENDED ')
                            .setFooter({ text: 'Giveaway ended' })
                            .setTimestamp();

                        if (winners.length > 0) {
                            const mentions = winners.map(id => `<@${id}>`).join(', ');
                            embed.addFields({ name: ' Winner(s)', value: mentions });
                            await channel.send(` Congratulations ${mentions}! You won **${giveaway.prize}**!`);
                        } else {
                            embed.addFields({ name: ' Winner(s)', value: 'No valid entries' });
                        }

                        await message.edit({ embeds: [embed], components: [] });
                        giveaway.active = false;
                        giveaway.winnerIds = winners;
                        changed = true;
                    } catch (err) {
                        logger.error('Giveaway end error', { error: err.message });
                    }
                }
                updatedGiveaways.push(giveaway);
            }

            if (changed) {
                await db.set(`giveaways_${guildId}`, updatedGiveaways);
            }
        }
    });

    // Performance jobs: Cleanup Maps
    scheduler.addJob('map-cleanup', 3600000, () => {
        try {
            const voiceEvents = require('../../events/voiceEvents');
            if (voiceEvents && typeof voiceEvents.cleanup === 'function') {
                voiceEvents.cleanup();
            }

            const messageCreate = require('../../events/messageCreate');
            if (messageCreate && typeof messageCreate.cleanup === 'function') {
                messageCreate.cleanup();
            }

            logger.debug('Scheduled cleanup of tracking Maps completed');
        } catch (err) {
            logger.error('Cleanup job error', { error: err.message });
        }
    });
}

module.exports = { registerJobs };
