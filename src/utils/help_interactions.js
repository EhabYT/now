const { EmbedBuilder, MessageFlags } = require('discord.js');
const { t, fromDiscordLocale } = require('./i18n');
const { safeReply } = require('./helpers');
const emojis = require('./emojis');
const logger = require('./logger');

async function handleHelpSelect(interaction) {
    const lang = fromDiscordLocale(interaction.locale);
    try {
        const categories = {
            moderation: { emoji: '' + emojis.shield + '', name: 'Moderation', cmds: '`ban`, `kick`, `timeout`, `unban`, `untimeout`, `warn`, `warnings`, `removewarn`, `clear`, `setnick`, `role`, `embed`, `announce`' },
            automod: { emoji: '' + emojis.robot + '', name: 'AutoMod', cmds: '`automod`, `automod-config`, `whitelist`, `lock`, `unlock`, `slowmode`' },
            utility: { emoji: '' + emojis.builder + '', name: 'Utility', cmds: '`ping`, `help`, `info`, `avatar`, `userinfo`, `serverinfo`, `poll`, `remind`, `membercount`, `qr`, `calc`, `invite`, `uptime`, `firstmessage`, `color`, `banner`, `roleinfo`, `emojis`, `password`, `servericon`, `channelinfo`, `enlarge`' },
            music: { emoji: '' + emojis.music + '', name: 'Music', cmds: '`play`, `stop`, `skip`, `pause`, `resume`, `queue`, `nowplaying`, `volume`, `shuffle`, `loop`, `autoplay`, `lyrics`' },
            fun: { emoji: '' + emojis.dice + '', name: 'Fun', cmds: '`coinflip`, `roll`, `rep`, `points`, `choose`, `random`, `8ball`, `reverse`, `mock`' },
            tickets: { emoji: '' + emojis.ticket + '', name: 'Tickets', cmds: '`ticket-setup`, `ticket-panel`, `ticket-add`, `ticket-remove`, `ticket-close`' },
            logging: { emoji: '' + emojis.save + '', name: 'Logging', cmds: '`logging-setup`, `logging-status`, `logging-disable`' },
            engagement: { emoji: '' + emojis.trophy + '', name: 'Engagement', cmds: '`stats`, `leaderboard`, `serverstats`, `reactionrole-setup`, `giveaway-start`, `boosters`' }
        };

        const choice = interaction.values[0];
        const data = categories[choice];

        if (!data) {
            return await safeReply(interaction, { content: t('bot.help.invalid', lang), flags: [MessageFlags.Ephemeral] });
        }

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${data.emoji} ${data.name} ${t('bot.help.commands', lang)}`)
            .setDescription(`${t(`bot.help.cat.${choice}`, lang)}\n\n**${t('bot.help.commands', lang)}:**\n${data.cmds}`)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    } catch (err) {
        logger.error('handleHelpSelect error', { error: err.message, code: err.code, state: { deferred: interaction.deferred, replied: interaction.replied }, stack: err.stack });
        try {
            await safeReply(interaction, { content: t('bot.help.error', lang), embeds: [], components: [] });
        } catch (err2) {
            logger.warn('handleHelpSelect fallback reply also failed', { code: err2.code });
        }
    }
}

module.exports = { handleHelpSelect };
