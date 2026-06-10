const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { tWithVars, fromDiscordLocale } = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to a channel')
        .setDescriptionLocalizations({ de: 'Eine Ankündigung an einen Kanal senden' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Announcement title').setRequired(true).setMaxLength(256))
        .addStringOption(opt => opt.setName('message').setDescription('Announcement content').setRequired(true).setMaxLength(4000))
        .addStringOption(opt => opt.setName('color').setDescription('Hex color (default #00fbff)'))
        .addStringOption(opt => opt.setName('ping').setDescription('Ping everyone?').addChoices({ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' })),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const message = interaction.options.getString('message');
        const color = interaction.options.getString('color') || '#00fbff';
        const ping = interaction.options.getString('ping') === 'yes';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(emojis.announce + ' ' + title)
            .setDescription(message)
            .setFooter({ text: `Announced by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        try {
            const content = ping ? '@everyone' : '';
            await channel.send({ content, embeds: [embed] });
            await safeReply(interaction, { content: emojis.check + ' ' + tWithVars('bot.announce.sent', { channel }, lang), flags: [MessageFlags.Ephemeral] });
        } catch (err) {
            await safeReply(interaction, { content: emojis.cross + ' ' + tWithVars('bot.error.failed', { error: err.message }, lang), flags: [MessageFlags.Ephemeral] });
        }
    }
};
