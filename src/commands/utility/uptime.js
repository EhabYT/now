const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Check how long the bot has been online')
        .setDescriptionLocalizations({ de: 'Betriebszeit des Bots überprüfen' }),

    async execute(interaction, client, db) {
        const total = client.uptime;
        const days = Math.floor(total / 86400000);
        const hours = Math.floor((total % 86400000) / 3600000);
        const minutes = Math.floor((total % 3600000) / 60000);
        const seconds = Math.floor((total % 60000) / 1000);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.clock} Bot Uptime`)
            .setDescription(`Online for **${parts.join(' ')}**`)
            .addFields(
                { name: 'Started', value: `<t:${Math.floor((Date.now() - total) / 1000)}:R>`, inline: true },
                { name: 'Ready since', value: `<t:${Math.floor((Date.now() - total) / 1000)}:f>`, inline: true }
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
