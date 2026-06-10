const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Get a user\'s banner image')
        .setDescriptionLocalizations({ de: 'Bannerbild eines Benutzers anzeigen' })
        .addUserOption(opt => opt.setName('user').setDescription('Target user')),

    async execute(interaction, client, db) {
        const user = interaction.options.getUser('user') || interaction.user;
        const fetched = await user.fetch(true);
        const banner = fetched.bannerURL({ size: 4096 });

        if (!banner) {
            return safeReply(interaction, {
                content: '' + emojis.cross + ` ${user.username} has no banner.`
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00fbff')
            .setTitle(`${emojis.image} ${user.username}'s Banner`)
            .setImage(banner)
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};
