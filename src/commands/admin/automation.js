const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { setCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automation')
        .setDescription('Stop or resume automation for tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt => opt.setName('option').setDescription('Start or stop automation').setRequired(true).addChoices({ name: 'Start', value: 'start' }, { name: 'Stop', value: 'stop' })),

    async execute(interaction, client, db) {
        const option = interaction.options.getString('option');
        const key = `automation_${interaction.guild.id}`;
        if (option === 'start') {
            await setCached(key, true);
            await safeReply(interaction, { content: `${emojis.check} Automation started.` });
        } else {
            await setCached(key, false);
            await safeReply(interaction, { content: `${emojis.cross} Automation stopped.` });
        }
    }
};
