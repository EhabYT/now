const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Get information about a role')
        .setDescriptionLocalizations({ de: 'Informationen über eine Rolle anzeigen' })
        .addRoleOption(opt => opt.setName('role').setDescription('Target role').setRequired(true)),

    async execute(interaction, client, db) {
        const role = interaction.options.getRole('role');

        const embed = new EmbedBuilder()
            .setColor(role.color || '#00fbff')
            .setTitle(`${emojis.roles} Role Info — ${role.name}`)
            .addFields(
                { name: 'ID', value: role.id, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Position', value: `${role.position}`, inline: true },
                { name: 'Members', value: `${role.members.size}`, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
                { name: 'Displayed separately', value: role.hoist ? 'Yes' : 'No', inline: true },
                { name: 'Created', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:f>`, inline: false }
            )
            .setTimestamp();

        if (role.icon) {
            embed.setThumbnail(role.iconURL({ size: 128 }));
        }

        await safeReply(interaction, { embeds: [embed] });
    }
};
