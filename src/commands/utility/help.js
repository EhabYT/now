const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const { t, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
      data: new SlashCommandBuilder()
            .setName('help')
            .setDescription('Help and FAQ for Ticket Tool')
            .setDescriptionLocalizations({ de: 'Hilfe und FAQ für Ticket Tool' })
            .addStringOption(opt => opt.setName('search').setDescription('Search for a command'))
            .addBooleanOption(opt => opt.setName('ephemeral').setDescription('Show help only to you')),

      async execute(interaction, client, db) {
            const lang = fromDiscordLocale(interaction.locale, interaction);
            const search = interaction.options.getString('search')?.toLowerCase();
            const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;

            const categories = {
                  Tickets: { emoji: '' + emojis.ticket + '', commands: '`new`, `close`, `open`, `delete`, `rename`, `add`, `remove`, `claim`, `unclaim`, `closerequest`, `escalate`, `panel`, `setup`, `transcript`' },
                  Settings: { emoji: '' + emojis.builder + '', commands: '`setup`, `automation`, `permissionlevel`, `purge`' },
                  General: { emoji: '' + emojis.books + '', commands: '`help`, `ping`, `id`, `debug`, `invite`, `premium`, `vote`, `commands`' },
                  Moderation: { emoji: '' + emojis.shield + '', commands: '`ban`, `kick`, `timeout`, `unban`, `untimeout`, `warn`, `warnings`, `removewarn`, `clear`, `setnick`, `role`, `embed`, `announce`' },
                  Utility: { emoji: '' + emojis.builder + '', commands: '`info`, `avatar`, `userinfo`, `serverinfo`, `poll`, `remind`, `membercount`, `qr`, `calc`, `uptime`, `firstmessage`, `color`, `banner`, `roleinfo`, `emojis`, `password`, `servericon`, `channelinfo`, `enlarge`' },
                  Music: { emoji: '' + emojis.music + '', commands: '`play`, `stop`, `skip`, `pause`, `resume`, `queue`, `nowplaying`, `volume`, `shuffle`, `loop`, `autoplay`, `lyrics`' },
                  Fun: { emoji: '' + emojis.dice + '', commands: '`coinflip`, `roll`, `rep`, `points`, `choose`, `random`, `8ball`, `reverse`, `mock`' }
            };

            if (search) {
                  const results = [];
                  for (const [cat, data] of Object.entries(categories)) {
                        if (cat.toLowerCase().includes(search) || data.commands.toLowerCase().includes(search)) {
                              results.push(`**${data.emoji} ${cat}**: ${data.commands}`);
                        }
                  }
                  if (!results.length) return safeReply(interaction, { content: `${emojis.cross} No commands found matching "${search}".`, flags: [MessageFlags.Ephemeral] });
                  return safeReply(interaction, { content: `**Search results for "${search}":**\n\n${results.join('\n')}`, flags: ephemeral ? [MessageFlags.Ephemeral] : undefined });
            }

            const embed = new EmbedBuilder()
                  .setColor('#00fbff')
                  .setTitle(`${emojis.books} ${t('bot.help.title', lang)} — Ticket Tool`)
                  .setDescription('Manage tickets, moderate, play music, and more.\nUse `$` prefix commands for quick actions.')
                  .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
                  .setFooter({ text: 'Ticket Tool — Premium Support Enabled', iconURL: client.user.displayAvatarURL() })
                  .setTimestamp();

            const select = new StringSelectMenuBuilder()
                  .setCustomId('help_category')
                  .setPlaceholder('' + emojis.folder + ' ' + t('bot.help.desc', lang))
                  .addOptions(Object.keys(categories).map(cat => ({ label: cat, value: cat.toLowerCase(), emoji: categories[cat].emoji, description: `View commands for ${cat}` })));

            const rowSelect = new ActionRowBuilder().addComponents(select);
            const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
            const rowButtons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setLabel('Invite Bot').setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`).setStyle(ButtonStyle.Link),
                  new ButtonBuilder().setLabel('Support Server').setURL('https://discord.gg/placeholder').setStyle(ButtonStyle.Link),
                  new ButtonBuilder().setLabel('Dashboard').setURL(dashboardUrl).setStyle(ButtonStyle.Link)
            );

            await safeReply(interaction, { embeds: [embed], components: [rowSelect, rowButtons], flags: ephemeral ? [MessageFlags.Ephemeral] : undefined });
      }
};
