const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../../utils/helpers');
const emojis = require('../../utils/emojis');
const { t, fromDiscordLocale } = require('../../utils/i18n');

function safeEval(expr) {
  const chars = expr.replace(/\s/g, '').split('');
  let pos = 0;
  function parseAddSub() {
    let left = parseMulDiv();
    while (pos < chars.length) {
      if (chars[pos] === '+') { pos++; left += parseMulDiv(); }
      else if (chars[pos] === '-') { pos++; left -= parseMulDiv(); }
      else break;
    }
    return left;
  }
  function parseMulDiv() {
    let left = parseUnary();
    while (pos < chars.length) {
      if (chars[pos] === '*') { pos++; left *= parseUnary(); }
      else if (chars[pos] === '/') { pos++; const d = parseUnary(); if (d === 0) throw new Error('Division by zero'); left /= d; }
      else break;
    }
    return left;
  }
  function parseUnary() {
    if (chars[pos] === '-') { pos++; return -parsePrimary(); }
    if (chars[pos] === '+') { pos++; return parsePrimary(); }
    return parsePrimary();
  }
  function parsePrimary() {
    if (chars[pos] === '(') { pos++; const v = parseAddSub(); if (chars[pos] !== ')') throw new Error('Missing )'); pos++; return v; }
    let num = '';
    while (pos < chars.length && /[0-9.]/.test(chars[pos])) { num += chars[pos]; pos++; }
    if (num === '') throw new Error('Invalid expression');
    return parseFloat(num);
  }
  return parseAddSub();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calc')
        .setDescription('Evaluate a math expression')
        .setDescriptionLocalizations({ de: 'Mathematischen Ausdruck berechnen' })
        .addStringOption(opt => opt.setName('expression').setDescription('Math expression (e.g. 2 + 2 * 5)').setRequired(true).setMaxLength(200)),

    async execute(interaction, client, db) {
        const lang = fromDiscordLocale(interaction.locale, interaction);
        const expression = interaction.options.getString('expression');
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
        if (!sanitized) return safeReply(interaction, { content: emojis.cross + ' ' + t('bot.calc.invalid', lang) });

        try {
            const result = safeEval(sanitized);
            if (!isFinite(result)) throw new Error('Invalid result');

            const embed = new EmbedBuilder()
                .setColor('#00fbff')
                .setTitle(emojis.builder + ' Calculator')
                .addFields(
                    { name: 'Expression', value: `\`\`\`${sanitized}\`\`\``, inline: false },
                    { name: 'Result', value: `\`\`\`${result}\`\`\``, inline: false }
                )
                .setTimestamp();

            await safeReply(interaction, { embeds: [embed] });
        } catch (err) {
            await safeReply(interaction, { content: emojis.cross + ' ' + t('bot.calc.error', lang) });
        }
    }
};
