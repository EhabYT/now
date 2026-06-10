const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set the slowmode for the current channel')
        .setDescriptionLocalizations({ de: 'Langsamkeit für den aktuellen Kanal festlegen' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)),

    async execute(interaction, client, db) {
        const seconds = interaction.options.getInteger('seconds');
        const { safeReply } = client.helpers;
        const lang = fromDiscordLocale(interaction.locale, interaction);

        try {
            await interaction.channel.setRateLimitPerUser(seconds);

            const embed = new EmbedBuilder()
                .setColor(seconds > 0 ? '#FFA500' : '#00FF88')
                .setTitle(emojis.stopwatch + ' ' + t('bot.slowmode.title', lang))
                .setDescription(tWithVars('bot.slowmode.desc', { channel: interaction.channel, seconds }, lang))
                .setFooter({ text: tWithVars('bot.slowmode.footer', { user: interaction.user.username }, lang) })
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.slowmode.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
        }
    }
};
