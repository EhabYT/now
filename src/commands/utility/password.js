const { SlashCommandBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const crypto = require('crypto');
const { tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('password')
        .setDescription('Generate a secure random password')
        .setDescriptionLocalizations({ de: 'Sicheres zufälliges Passwort generieren' })
        .addIntegerOption(opt => opt.setName('length').setDescription('Password length (8-128)').setMinValue(8).setMaxValue(128).setRequired(false)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const length = interaction.options.getInteger('length') || 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        const password = Array.from(crypto.randomBytes(length))
            .map(b => chars[b % chars.length])
            .join('');

        await safeReply(interaction, {
            content: `${emojis.key} ${tWithVars('bot.password.generated', { length }, lang)}\n\`\`\`${password}\`\`\``
        });
    }
};
