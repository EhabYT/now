const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../../config/settings.json');

let settings;
try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
} catch (err) {
    settings = { colors: {}, emojis: {}, profanity: [] };
}

// Allow env vars to override profanity list
if (process.env.PROFANITY_LIST) {
    settings.profanity = process.env.PROFANITY_LIST.split(',').map(w => w.trim().toLowerCase());
}

// Allow env var to append additional words
if (process.env.PROFANITY_EXTRA) {
    const extra = process.env.PROFANITY_EXTRA.split(',').map(w => w.trim().toLowerCase());
    for (const word of extra) {
        if (!settings.profanity.includes(word)) settings.profanity.push(word);
    }
}

module.exports = settings;