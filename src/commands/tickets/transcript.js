const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { getCached } = require('../../utils/db');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('Create a transcript of the current ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to transcript'))
        .addUserOption(opt => opt.setName('user').setDescription('Filter messages by user'))
        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of messages (max 1000)').setMinValue(1).setMaxValue(1000)),

    async execute(interaction, client, db) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const filterUser = interaction.options.getUser('user');
        const limit = interaction.options.getInteger('limit') || 100;
        const config = await getCached(`tickets_${interaction.guild.id}`) || {};

        try {
            const msgs = await channel.messages.fetch({ limit: Math.min(limit, 1000) });
            let sorted = [...msgs.values()].reverse();
            if (filterUser) sorted = sorted.filter(m => m.author.id === filterUser.id);

            const transcript = sorted.map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).join('\n');
            const buf = Buffer.from(transcript, 'utf8');
            const logCh = config.logChannel ? interaction.guild.channels.cache.get(config.logChannel) : null;
            const sendTo = logCh || interaction.channel;
            await sendTo.send({ files: [{ attachment: buf, name: `transcript-${channel.name}.txt` }] });
            if (sendTo.id !== interaction.channel.id) await safeReply(interaction, { content: `${emojis.check} Transcript sent to ${sendTo}.`, flags: [MessageFlags.Ephemeral] });
            else await safeReply(interaction, { content: `${emojis.check} Transcript generated.`, flags: [MessageFlags.Ephemeral] });
        } catch (err) {
            await safeReply(interaction, { content: `${emojis.cross} Transcript failed: ${err.message}`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
