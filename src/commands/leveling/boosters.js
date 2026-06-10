const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('boosters')
        .setDescription('List server boosters and boost status')
        .setDescriptionLocalizations({ de: 'Server-Booster und Boost-Status auflisten' }),

    async execute(interaction, client, db) {
        const guild = interaction.guild;
        const boosters = guild.members.cache.filter(m => m.premiumSince);

        const embed = new EmbedBuilder()
            .setColor('#f47fff')
            .setTitle(`${emojis.gold} Server Boosters`)
            .addFields(
                { name: 'Boost Count', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
                { name: 'Boost Tier', value: `${guild.premiumTier || 0}`, inline: true },
                { name: 'Boosters', value: boosters.size > 0 ? boosters.map(m => m.user.username).join('\n') : 'No boosters yet', inline: false }
            )
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp();

        if (boosters.size > 20) {
            embed.spliceFields(2, 1, { name: 'Boosters', value: `${boosters.size} boosters — list too long to display.` });
        }

        await safeReply(interaction, { embeds: [embed] });
    }
};
