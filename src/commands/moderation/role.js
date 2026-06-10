const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage roles for a user')
        .setDescriptionLocalizations({ de: 'Rollen für einen Benutzer verwalten' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub => sub.setName('add').setDescription('Add a role to a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a role from a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all roles of a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const sub = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.mod.user_not_found', lang), flags: [MessageFlags.Ephemeral] });

        if (sub === 'add') {
            const role = interaction.options.getRole('role');
            if (role.managed) return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.role.managed', lang), flags: [MessageFlags.Ephemeral] });
            if (member.roles.cache.has(role.id)) return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.role.already_has', lang), flags: [MessageFlags.Ephemeral] });
            try {
                await member.roles.add(role);
                await safeReply(interaction, { content: emojis.check + ' ' + tWithVars('bot.role.added', { role, user }, lang), flags: [MessageFlags.Ephemeral] });
            } catch (err) {
                await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.error.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
            }
        } else if (sub === 'remove') {
            const role = interaction.options.getRole('role');
            if (!member.roles.cache.has(role.id)) return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.role.not_have', lang), flags: [MessageFlags.Ephemeral] });
            try {
                await member.roles.remove(role);
                await safeReply(interaction, { content: emojis.check + ' ' + tWithVars('bot.role.removed', { role, user }, lang), flags: [MessageFlags.Ephemeral] });
            } catch (err) {
                await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.error.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
            }
        } else if (sub === 'list') {
            const roles = member.roles.cache.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);
            const list = roles.map(r => `${r}`).join('\n') || 'No roles';
            await safeReply(interaction, { content: emojis.roles + ' ' + tWithVars('bot.role.list_format', { user: user.username, count: roles.size }, lang) + '\n' + list, flags: [MessageFlags.Ephemeral] });
        }
    }
};
