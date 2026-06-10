const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('firstmessage')
        .setDescription('Get the first message in this channel')
        .setDescriptionLocalizations({ de: 'Erste Nachricht in diesem Kanal anzeigen' }),

    async execute(interaction, client, db) {
        if (!interaction.deferred && !interaction.replied) { await interaction.deferReply().catch(() => {}); }

        try {
            const messages = await interaction.channel.messages.fetch({ limit: 1, after: '0' });
            const first = messages.first();

            if (!first) {
                return safeReply(interaction, { content: '' + emojis.cross + ' Could not find the first message.' });
            }

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle(`${emojis.pin} First Message in #${interaction.channel.name}`)
                .setDescription(first.content || '*No text content*')
                .setAuthor({ name: first.author.username, iconURL: first.author.displayAvatarURL() })
                .addFields(
                    { name: 'Author', value: `<@${first.author.id}>`, inline: true },
                    { name: 'Date', value: `<t:${Math.floor(first.createdTimestamp / 1000)}:f>`, inline: true },
                    { name: 'Jump', value: `[Click here](${first.url})`, inline: true }
                )
                .setTimestamp();

            if (first.attachments.size > 0) {
                const attach = first.attachments.first();
                if (attach.contentType && attach.contentType.startsWith('image/')) {
                    embed.setImage(attach.url);
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await safeReply(interaction, { content: '' + emojis.cross + ' Error fetching first message. The channel may not allow message history access.' });
        }
    }
};
