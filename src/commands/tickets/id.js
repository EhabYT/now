const { SlashCommandBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id')
        .setDescription('Get the id of things like users, roles, channels and emojis')
        .addStringOption(opt => opt.setName('option').setDescription('User, role, channel mention or emoji')),

    async execute(interaction, client, db) {
        const option = interaction.options.getString('option');
        const target = interaction.options.getUser('user') || interaction.options.getRole('role') || interaction.options.getChannel('channel');
        if (target) return safeReply(interaction, { content: `${target.toString()}: \`${target.id}\`` });

        if (option) {
            const emojiMatch = option.match(/^<a?:(\w+):(\d+)>$/);
            if (emojiMatch) return safeReply(interaction, { content: `:${emojiMatch[1]}: \`${emojiMatch[2]}\`` });
        }
        return safeReply(interaction, { content: `**Server ID:** \`${interaction.guild.id}\`` });
    }
};
