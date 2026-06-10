const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const { safeReply } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .setDescriptionLocalizations({ de: 'Einen Benutzer verwarnen' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const warnId = uuidv4().split('-')[0];
        const warning = { id: warnId, moderator: interaction.user.id, reason, timestamp: Date.now() };

        const key = `warnings_${interaction.guild.id}_${user.id}`;
        const warnings = await db.get(key) || [];
        warnings.push(warning);
        await db.set(key, warnings);

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle('' + emojis.warning + ' ' + t('bot.mod.warned_title', lang))
            .addFields(
                { name: t('bot.mod.user', lang), value: `${user.username} (${user.id})`, inline: true },
                { name: t('bot.mod.moderator', lang), value: `${interaction.user}`, inline: true },
                { name: t('bot.mod.no_reason', lang), value: reason },
                { name: t('bot.mod.warning_id', lang), value: `\`${warnId}\``, inline: true },
                { name: t('bot.mod.total_warnings', lang), value: `${warnings.length}`, inline: true }
            )
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
