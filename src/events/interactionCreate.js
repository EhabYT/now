const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { safeReply } = require('../utils/helpers');
const { t, fromDiscordLocale, guildLocale } = require('../utils/i18n');
const { handleMusicButton, handleMusicFilterSelect } = require('../utils/music_interactions');
const { handleHelpSelect } = require('../utils/help_interactions');
const emojis = require('../utils/emojis');

const DISCORD_ERR_INTERACTION_ALREADY_REPLIED = 40060;

// Dedup: Discord at-least-once delivery sends duplicates with the same ID
const processed = new Set();
setInterval(() => processed.clear(), 60000); // GC every 60s

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        const db = client.db;

        // Duplicate detection
        if (processed.has(interaction.id)) return;
        processed.add(interaction.id);

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Safety: if interaction was already acknowledged (e.g. Discord retry), bail out silently
            if (interaction.replied || interaction.deferred) return;

            // Defer immediately — before any DB calls — to prevent 3-second interaction timeout
            const isDeferred = command.defer;
            if (isDeferred) {
                try {
                    await interaction.deferReply({ flags: (command.ephemeral ? [MessageFlags.Ephemeral] : []) });
                } catch (err) {
                    // Discord delivers interactions at-least-once; duplicates hit here silently
                    return;
                }
            }

            // Resolve locale: guild-level override > Discord user locale
            let guildLang = null;
            if (interaction.guildId) {
                const guildData = await client.db.get(`locale_${interaction.guildId}`).catch(() => null);
                if (guildData) guildLang = guildData;
            }
            interaction._guildLocale = guildLang;
            interaction._resolvedLocale = guildLocale(guildLang, interaction.locale);

            // Check if command is disabled via dashboard
            const enabledMap = await db.get(`commands_enabled_${interaction.guildId}`).catch(() => ({})) || {};
            if (enabledMap[interaction.commandName] === false) {
                const lang = interaction._resolvedLocale;
                const content = '' + emojis.disabled + ' ' + t('bot.cmd.disabled', lang);
                if (isDeferred) {
                    return await interaction.editReply({ content }).catch(() => {});
                }
                return await interaction.reply({ content, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }

            logger.command(interaction.commandName, interaction.user, interaction.guild);
            try {
                await command.execute(interaction, client, db);
            } catch (err) {
                logger.error(`Command error: /${interaction.commandName}`, { error: err.message, stack: err.stack });
                if (!interaction.replied && !interaction.deferred) {
                    const lang = fromDiscordLocale(interaction.locale, interaction);
                    const EmbedHelper = require('../utils/embed');
                    const embed = EmbedHelper.error(t('bot.error.generic', lang) + '\n```' + err.message + '```', client);
                    await safeReply(interaction, {
                        embeds: [embed],
                        flags: [MessageFlags.Ephemeral]
                    });
                }
            }
        }
        else if (interaction.isButton()) {
            try {
                if (interaction.customId === 'verification_entry') {
                    const lang = fromDiscordLocale(interaction.locale);
                    const config = await db.get(`verification_${interaction.guildId}`);
                    if (config && config.roleId) {
                        const role = interaction.guild.roles.cache.get(config.roleId);
                        if (role) {
                            try {
                                await interaction.member.roles.add(role);
                                await safeReply(interaction, { content: '' + emojis.check + ' ' + t('bot.verification.verified', lang), flags: [MessageFlags.Ephemeral] });
                            } catch (err) {
                                logger.error('Verification role assignment failed', { error: err.message });
                                await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.verification.failed', lang), flags: [MessageFlags.Ephemeral] });
                            }
                        } else {
                            await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.verification.no_role', lang), flags: [MessageFlags.Ephemeral] });
                        }
                    } else {
                        await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.verification.not_setup', lang), flags: [MessageFlags.Ephemeral] });
                    }
                }
                else if (interaction.customId.startsWith('music_')) await handleMusicButton(interaction, client.player, db);
            } catch (err) {
                // Silently ignore already-acknowledged duplicates
                if (err.code !== DISCORD_ERR_INTERACTION_ALREADY_REPLIED) {
                    logger.error('Button interaction error', { error: err.message, customId: interaction.customId });
                }
            }
        }
        else if (interaction.isStringSelect()) {
            try {
                if (interaction.customId === 'music_filters') await handleMusicFilterSelect(interaction, client.player, db);
                else if (interaction.customId === 'help_category') await handleHelpSelect(interaction);
            } catch (err) {
                if (err.code !== DISCORD_ERR_INTERACTION_ALREADY_REPLIED) {
                    logger.error('SelectMenu interaction error', { error: err.message, customId: interaction.customId });
                }
            }
        }
    }
};
