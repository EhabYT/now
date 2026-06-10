const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the current channel')
        .setDescriptionLocalizations({ de: 'Den aktuellen Kanal entsperren' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client, db) {
        const { safeReply } = client.helpers;
        const lang = fromDiscordLocale(interaction.locale, interaction);

        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null
            });

            const embed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle(emojis.unlock + ' ' + t('bot.unlock.title', lang))
                .setDescription(tWithVars('bot.unlock.desc', { user: interaction.user }, lang))
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.unlock.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
        }
    }
};
