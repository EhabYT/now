const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('View or manage credits')
        .setDescriptionLocalizations({ de: 'Credits anzeigen oder verwalten' })
        .addUserOption(opt => opt.setName('user').setDescription('User'))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount (mod only)'))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason')),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const user = interaction.options.getUser('user') || interaction.user;
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason') || '';
        const key = `credits_${interaction.guild.id}_${user.id}`;

        if (amount !== null) {
            const { hasModPerms } = require('../../utils/helpers');
            if (!hasModPerms(interaction.member)) {
                return await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.credits.mod_only', lang), flags: [MessageFlags.Ephemeral] });
            }

            const current = (await db.get(key)) || 0;
            const next = current + amount;
            await db.set(key, next);

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle(emojis.credits + ' ' + t('bot.credits.updated', lang))
                .addFields(
                    { name: 'User', value: `${user}`, inline: true },
                    { name: 'Change', value: `${amount > 0 ? '+' : ''}${amount.toLocaleString()}`, inline: true },
                    { name: 'New Balance', value: `${next.toLocaleString()}`, inline: true }
                )
                .setTimestamp();

            if (reason) embed.addFields({ name: 'Reason', value: reason });

            return await safeReply(interaction, { embeds: [embed] });
        }

        const credits = (await db.get(key)) || 0;
        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.credits} Credits | ${user.username}`)
            .setDescription(tWithVars('bot.credits.display', { user: user.username, credits: credits.toLocaleString() }, lang))
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .setTimestamp();

        return await safeReply(interaction, { embeds: [embed] });
    }
};
