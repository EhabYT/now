const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');
const { safeReply, checkDJPerms } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay to get related song suggestions')
        .setDescriptionLocalizations({ de: 'Automatische Wiedergabe umschalten' }),

    async execute(interaction, client, db) {
        const queue = useQueue(interaction.guild.id);
        const lang = fromDiscordLocale(interaction.locale, interaction);

        if (!queue) {
            return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.music.no_queue', lang), flags: [MessageFlags.Ephemeral] });
        }

        const isDJ = await checkDJPerms(interaction, db);
        if (!isDJ) {
            return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.music.dj_required', lang), flags: [MessageFlags.Ephemeral] });
        }

        const isEnabled = queue.repeatMode === QueueRepeatMode.AUTOPLAY;
        await queue.setRepeatMode(isEnabled ? QueueRepeatMode.OFF : QueueRepeatMode.AUTOPLAY);

        await db.set(`autoplay_${interaction.guild.id}`, !isEnabled);

        await safeReply(interaction, {
            content: emojis.sparkles + ' ' + t(!isEnabled ? 'bot.autoplay.status_enabled' : 'bot.autoplay.status_disabled', lang)
        });
    }
};
