const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the current channel')
        .setDescriptionLocalizations({ de: 'Den aktuellen Kanal sperren' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client, db) {
        const { safeReply } = client.helpers;
        const lang = fromDiscordLocale(interaction.locale, interaction);

        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            });

            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle(emojis.lock + ' ' + t('bot.lock.title', lang))
                .setDescription(tWithVars('bot.lock.desc', { user: interaction.user }, lang))
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.lock.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
        }
    }
};
