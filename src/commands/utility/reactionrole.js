const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Manage reaction roles')
        .setDescriptionLocalizations({ de: 'Reaktionsrollen verwalten' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set up a reaction role')
                .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
                .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
                .addStringOption(opt => opt.setName('mode').setDescription('Mode')
                    .addChoices(
                        { name: 'Toggle', value: 'toggle' },
                        { name: 'Add only', value: 'add' },
                        { name: 'Remove only', value: 'remove' }
                    ))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a reaction role')
                .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all reaction roles')
        ),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const messageId = interaction.options.getString('message_id');
            const emoji = interaction.options.getString('emoji');
            const role = interaction.options.getRole('role');
            const mode = interaction.options.getString('mode') || 'toggle';

            const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
            if (!message) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.reactionrole.message_not_found', lang), flags: [MessageFlags.Ephemeral] });

            try {
                await message.react(emoji);
            } catch {
                return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.reactionrole.invalid_emoji', lang), flags: [MessageFlags.Ephemeral] });
            }

            const key = `reactionroles_${interaction.guild.id}`;
            const rr = await db.get(key) || [];
            const filtered = rr.filter(r => !(r.messageId === messageId && r.emoji === emoji));

            filtered.push({ messageId, channelId: interaction.channel.id, emoji, roleId: role.id, mode });
            await db.set(key, filtered);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('' + emojis.check + ' ' + t('bot.reactionrole.created_title', lang))
                .addFields(
                    { name: t('bot.reactionrole.emoji', lang), value: emoji, inline: true },
                    { name: t('bot.reactionrole.role', lang), value: `${role}`, inline: true },
                    { name: t('bot.reactionrole.mode', lang), value: mode, inline: true }
                )
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'remove') {
            const messageId = interaction.options.getString('message_id');
            const emoji = interaction.options.getString('emoji');
            const key = `reactionroles_${interaction.guild.id}`;

            const rr = await db.get(key) || [];
            const filtered = rr.filter(r => !(r.messageId === messageId && r.emoji === emoji));

            if (filtered.length === rr.length) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.reactionrole.not_found', lang), flags: [MessageFlags.Ephemeral] });

            await db.set(key, filtered);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('' + emojis.check + ' ' + t('bot.reactionrole.removed_title', lang))
                .setDescription(tWithVars('bot.reactionrole.removed_desc', { emoji, messageId }, lang))
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }

        if (subcommand === 'list') {
            const rr = await db.get(`reactionroles_${interaction.guild.id}`) || [];

            if (rr.length === 0) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.reactionrole.no_roles', lang), flags: [MessageFlags.Ephemeral] });

            const desc = rr.map((r, i) => `**${i + 1}.** ${r.emoji} → <@&${r.roleId}> (${r.mode})\nMsg: \`${r.messageId}\` in <#${r.channelId}>`).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('' + emojis.roles + ' ' + t('bot.reactionrole.list_title', lang))
                .setDescription(desc)
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }
    }
};
