const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('color')
        .setDescription('Preview a hex color')
        .setDescriptionLocalizations({ de: 'Hex-Farbe vorschauen' })
        .addStringOption(opt => opt.setName('hex').setDescription('Hex color code (e.g. #00fbff)').setRequired(true)),

    async execute(interaction, client, db) {
        const hex = interaction.options.getString('hex').replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
            return safeReply(interaction, { content: '' + emojis.cross + ' Invalid hex color. Use format `#RRGGBB` (e.g. `#00fbff`).' });
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const embed = new EmbedBuilder()
            .setColor(parseInt(hex, 16))
            .setTitle(`${emojis.builder} Color Preview`)
            .setDescription(`**#${hex.toUpperCase()}**`)
            .addFields(
                { name: 'RGB', value: `${r}, ${g}, ${b}`, inline: true },
                { name: 'HSL', value: `${rgbToHsl(r, g, b)}`, inline: true },
                { name: 'HEX', value: `#${hex.toUpperCase()}`, inline: true }
            )
            .setThumbnail(`https://singlecolorimage.com/get/${hex}/200x200`)
            .setTimestamp();

        await safeReply(interaction, { embeds: [embed] });
    }
};

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}
