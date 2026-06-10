const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Ticket Tool Invite & Support')
        .setDescriptionLocalizations({ de: 'Ticket Tool Einladung & Support' }),

    async execute(interaction, client, db) {
        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.invite} Ticket Tool — Invite & Support`)
            .setDescription('Add Ticket Tool to your server and get support!')
            .addFields(
                { name: 'Bot Invite', value: '[Click here to invite](https://discord.com/api/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot%20applications.commands)', inline: false },
                { name: 'Support Server', value: '[Join the support server](https://discord.gg/placeholder)', inline: false },
                { name: 'Dashboard', value: '[Open Dashboard](' + (process.env.DASHBOARD_URL || 'http://localhost:3000') + ')', inline: false }
            )
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Invite Bot').setURL('https://discord.com/api/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot%20applications.commands').setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Support Server').setURL('https://discord.gg/placeholder').setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('Dashboard').setURL(process.env.DASHBOARD_URL || 'http://localhost:3000').setStyle(ButtonStyle.Link)
        );

        await safeReply(interaction, { embeds: [embed], components: [row] });
    }
};
