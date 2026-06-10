const config = require('./config');

const EMOJI_FALLBACKS = {
  check: '\u2705', cross: '\u274c', music: '\uD83C\uDFB5', shield: '\uD83D\uDEE1\uFE0F',
  gift: '\uD83C\uDF89', warning: '\u26A0\uFE0F', ban: '\uD83D\uDD28', kick: '\uD83D\uDC62',
  lock: '\uD83D\uDD12', unlock: '\uD83D\uDD13', trash: '\uD83D\uDDD1\uFE0F', sparkles: '\u2728',
  chart: '\uD83D\uDCCA', growth: '\uD83D\uDCC8', pause: '\u23F8\uFE0F', play: '\u25B6\uFE0F',
  skip: '\u23ED\uFE0F', shuffle: '\uD83D\uDD00', repeat: '\uD83D\uDD01', stopwatch: '\u23F1\uFE0F',
  pencil: '\u270F\uFE0F', users: '\uD83D\uDC65', ticket: '\uD83C\uDFAB', roles: '\uD83C\uDFAD',
  clock: '\u23F0', star: '\u2B50', dice: '\uD83C\uDFB2', coin: '\uD83E\uDE99',
  ping: '\uD83D\uDCE1', globe: '\uD83C\uDF10', robot: '\uD83E\uDD16', rocket: '\uD83D\uDE80',
  stop: '\uD83D\uDED1', volume: '\uD83D\uDD0A', mute: '\uD83D\uDD07', timeout: '\u23F3',
  search: '\uD83D\uDD0D', bolt: '\u26A1', trophy: '\uD83C\uDFC6', stats: '\uD83D\uDCCA',
  message: '\uD83D\uDCAC', voice: '\uD83C\uDFA4', heart: '\u2764\uFE0F', credits: '\uD83D\uDCB0',
  server: '\uD83C\uDFE2', text: '\uD83D\uDCAC', category: '\uD83D\uDCC1', poll: '\uD83D\uDDF3\uFE0F',
  folder: '\uD83D\uDCC2', wave: '\uD83D\uDC4B', gear: '\u2699\uFE0F', mail: '\u2709\uFE0F',
  thread: '\uD83E\uDDF5', tag: '\uD83C\uDFF7\uFE0F', settings: '\u2699\uFE0F', invite: '\u2709\uFE0F',
  refresh: '\uD83D\uDD04', disabled: '\uD83D\uDEAB', verification: '\uD83D\uDD10',
  test: '\uD83E\uDDEA', terminal: '\uD83D\uDCDF', bridge: '\uD83C\uDF09', info: '\u2139\uFE0F',
  success: '\u2705', error: '\u274c', alert: '\u26A0\uFE0F',
  reply: '\u21A9\uFE0F', listening: '\uD83C\uDFA7', competing: '\uD83C\uDFC6',
  announce: '\uD83D\uDCE2', builder: '\uD83D\uDEE0\uFE0F', broom: '\uD83E\uDDF9', infinity: '\u267E\uFE0F',
  medal: '\uD83C\uDFC5', save: '\uD83D\uDCBE', file: '\uD83D\uDCC4', key: '\uD83D\uDD11',
  rightArrow: '\u27A1\uFE0F', badWords: '\uD83E\uDD2C', caps: '\uD83D\uDD20',
  emojiSpam: '\uD83D\uDE0B', mentions: '\uD83D\uDCE2', link: '\uD83D\uDD17',
  export: '\uD83D\uDCE4', import: '\uD83D\uDCE5', bomb: '\uD83D\uDCA3', move: '\uD83D\uDE9A',
  tv: '\uD83D\uDCFA', channel: '\uD83D\uDCFA', multiply: '\u2716',
  progress: '\uD83D\uDCCA', playing: '\u25B6\uFE0F', watching: '\uD83D\uDCFA',
  pin: '\uD83D\uDCCC', note: '\uD83D\uDCCB', online: '\uD83D\uDFE2', idle: '\uD83D\uDFE1',
  dnd: '\uD83D\uDD34', invisible: '\u26AA',
  books: '\uD83D\uDCDA', gold: '\uD83E\uDD47', silver: '\uD83E\uDD48', bronze: '\uD83E\uDD49',
  satellite: '\uD83D\uDEF0\uFE0F', pingPong: '\uD83C\uDFD3', party: '\uD83C\uDF89',
  grinning: '\uD83D\uDE00', clipboard: '\uD83D\uDCCB', arrowUp: '\u2B06\uFE0F',
  door: '\uD83D\uDEAA', repeatOne: '\uD83D\uDD02', unban: '\uD83D\uDC64',
  sourceYt: '\uD83D\uDCFA', sourceSpotify: '\uD83C\uDFB5',
  number0: '0\u20E3', number1: '1\u20E3', number2: '2\u20E3', number3: '3\u20E3',
  number4: '4\u20E3', number5: '5\u20E3', number6: '6\u20E3', number7: '7\u20E3',
  number8: '8\u20E3', number9: '9\u20E3', number10: '\uD83D\uDD1F'
};

const emojis = {};
for (const [name, fallback] of Object.entries(EMOJI_FALLBACKS)) {
  const envKey = `EMOJI_${name.toUpperCase()}`;
  const customId = process.env[envKey] || config.emoji_ids?.[name];
  emojis[name] = customId ? `<:${name}:${customId}>` : fallback;
}

emojis.custom = (name, customId) => {
  if (customId) return `<:${name}:${customId}>`;
  return EMOJI_FALLBACKS[name] || `:${name}:`;
};

module.exports = emojis;
