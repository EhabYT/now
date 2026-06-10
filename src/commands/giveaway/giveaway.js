const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { t, tWithVars, fromDiscordLocale } = require('../../utils/i18n');
const emojis = require('../../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways')
        .setDescriptionLocalizations({ de: 'Gewinnspiele verwalten' })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Start a giveaway')
                .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
                .addStringOption(opt => opt.setName('duration').setDescription('Duration (1m, 1h, 1d, 1w)').setRequired(true))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20))
        )
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(opt => opt.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Reroll giveaway winners')
                .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List active giveaways')
        ),
    defer: true,

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const subcommand = interaction.options.getSubcommand();
        const { safeReply } = client.helpers;

        if (subcommand === 'start') {
            const prize = interaction.options.getString('prize');
            const durationStr = interaction.options.getString('duration');
            const winners = interaction.options.getInteger('winners') || 1;
            const duration = client.helpers.parseTimeString(durationStr);

            if (!duration) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.invalid_duration', lang), flags: [MessageFlags.Ephemeral] });

            const endsAt = Date.now() + duration;
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('' + emojis.gift + ' GIVEAWAY ' + emojis.gift + '')
                .setDescription(`**${prize}**\n\n${tWithVars('bot.giveaway.react_to_enter', { emoji: emojis.gift }, lang)}\n\n${emojis.clock} ${t('bot.giveaway.ends_label', lang)}: <t:${Math.floor(endsAt / 1000)}:R>\n${emojis.users} ${t('bot.giveaway.winners_label', lang)}: ${winners}\n${emojis.ticket} ${t('bot.giveaway.hosted_by', lang)}: ${interaction.user}`)
                .setFooter({ text: tWithVars('bot.giveaway.winner_count', { count: winners }, lang) })
                .setTimestamp(endsAt);

            const message = await interaction.channel.send({ embeds: [embed] }).catch(() => null);
            if (!message) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.failed', lang), flags: [MessageFlags.Ephemeral] });
            await message.react('' + emojis.gift + '');

            const giveaways = await db.get(`giveaways_${interaction.guild.id}`) || [];
            giveaways.push({ messageId: message.id, channelId: interaction.channel.id, prize, winners, endsAt, hostId: interaction.user.id, active: true });
            await db.set(`giveaways_${interaction.guild.id}`, giveaways);

            return await safeReply(interaction, { content: `${emojis.check} ${t('bot.giveaway.started', lang)} <t:${Math.floor(endsAt / 1000)}:R>`, flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === 'end') {
            const messageId = interaction.options.getString('message_id');
            const giveaways = await db.get(`giveaways_${interaction.guild.id}`) || [];
            const giveaway = giveaways.find(g => g.messageId === messageId && g.active);

            if (!giveaway) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.not_found', lang), flags: [MessageFlags.Ephemeral] });

            giveaway.endsAt = Date.now() - 1000;
            await db.set(`giveaways_${interaction.guild.id}`, giveaways);

            return await safeReply(interaction, { content: '' + emojis.check + ' ' + t('bot.giveaway.ended', lang), flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === 'reroll') {
            const messageId = interaction.options.getString('message_id');
            const giveaways = await db.get(`giveaways_${interaction.guild.id}`) || [];
            const giveaway = giveaways.find(g => g.messageId === messageId && !g.active);

            if (!giveaway) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.ended_not_found', lang), flags: [MessageFlags.Ephemeral] });

            try {
                const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
                if (!channel) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.channel_not_found', lang), flags: [MessageFlags.Ephemeral] });

                const message = await channel.messages.fetch(messageId).catch(() => null);
                if (!message) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.message_not_found', lang), flags: [MessageFlags.Ephemeral] });

                const emojiStr = '' + emojis.gift + '';
                const emojiName = emojiStr.match(/^<a?:(\w+):\d+>$/)?.[1] || emojiStr;
                const reaction = message.reactions.cache.find(r => r.emoji.name === emojiName);
                if (!reaction) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.no_reactions', lang), flags: [MessageFlags.Ephemeral] });

                const users = await reaction.users.fetch();
                const eligible = users.filter(u => !u.bot && !(giveaway.winnerIds || []).includes(u.id));

                if (eligible.size === 0) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.no_eligible', lang), flags: [MessageFlags.Ephemeral] });

                const winner = eligible.random();
                await channel.send(tWithVars('bot.giveaway.new_winner', { winner, prize: giveaway.prize }, lang)).catch(() => {});

                return await safeReply(interaction, { content: `${emojis.check} ${tWithVars('bot.giveaway.rerolled', { winner }, lang)}`, flags: [MessageFlags.Ephemeral] });
            } catch (err) {
                return await safeReply(interaction, { content: `${emojis.cross} ${tWithVars('bot.error.failed', { error: err.message }, lang)}`, flags: [MessageFlags.Ephemeral] });
            }
        }

        if (subcommand === 'list') {
            const giveaways = (await db.get(`giveaways_${interaction.guild.id}`) || []).filter(g => g.active);

            if (giveaways.length === 0) return await safeReply(interaction, { content: '' + emojis.cross + ' ' + t('bot.giveaway.no_active', lang), flags: [MessageFlags.Ephemeral] });

            const desc = giveaways.map((g, i) => `**${i + 1}.** ${g.prize}\n${t('bot.giveaway.ends_label', lang)}: <t:${Math.floor(g.endsAt / 1000)}:R> | ${t('bot.giveaway.winners_label', lang)}: ${g.winners}`).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('' + emojis.gift + ' ' + t('bot.giveaway.active_title', lang))
                .setDescription(desc)
                .setTimestamp();

            return await safeReply(interaction, { embeds: [embed] });
        }
    }
};
