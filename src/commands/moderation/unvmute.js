const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const emojis = require('../../utils/emojis');
const { safeReply } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unvmute')
    .setDescription('Unmute a voice muted member!')
    .setDescriptionLocalizations({ de: 'Stummschaltung eines Mitglieds im Sprachkanal aufheben' })
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to unmute').setRequired(true)),

  async execute(interaction, client, db) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return await safeReply(interaction, { content: '' + emojis.cross + ' User not found.', flags: [MessageFlags.Ephemeral] });
    if (!member.voice.channel) return await safeReply(interaction, { content: '' + emojis.cross + ' User is not in a voice channel.', flags: [MessageFlags.Ephemeral] });

    try {
      await member.voice.setMute(false, `Unmuted by ${interaction.user.username}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('' + emojis.volume + ' Voice Unmuted')
        .setDescription(`${user} has been unmuted in voice.`)
        .setTimestamp();

      await safeReply(interaction, { embeds: [embed] });
    } catch (err) {
      await safeReply(interaction, { content: `${emojis.cross} Failed: ${err.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
  }
};
