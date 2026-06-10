const { Events, EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const emojis = require('../utils/emojis');

module.exports = [
    {
        name: Events.GuildBanAdd,
        async execute(ban, client) {
            const logCfg = await client.db.get(`logging_${ban.guild.id}`) || {};
            const logChId = logCfg.ban || logCfg.moderation;
            if (!logChId) return;

            const logCh = await ban.guild.channels.fetch(logChId).catch(() => null);
            if (!logCh) return;

            const embed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('' + emojis.hammer + ' Member Banned')
                .addFields(
                    { name: 'User', value: `${ban.user.username} (${ban.user.id})`, inline: true },
                    { name: 'Reason', value: ban.reason || 'No reason provided' }
                )
                .setTimestamp();

            await logCh.send({ embeds: [embed] }).catch(() => {});
        }
    },
    {
        name: Events.GuildBanRemove,
        async execute(ban, client) {
            const logCfg = await client.db.get(`logging_${ban.guild.id}`) || {};
            const logChId = logCfg.unban || logCfg.moderation;
            if (!logChId) return;

            const logCh = await ban.guild.channels.fetch(logChId).catch(() => null);
            if (!logCh) return;

            const embed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('' + emojis.unlock + ' Member Unbanned')
                .addFields({ name: 'User', value: `${ban.user.username} (${ban.user.id})` })
                .setTimestamp();

            await logCh.send({ embeds: [embed] }).catch(() => {});
        }
    }
];

