const { QuickDB } = require('quick.db');
const db = new QuickDB();

// ── Key-level cache (5 min TTL) ──
const cache = new Map();
const TTL = 300000;

async function getCached(key, useCache = true) {
    if (useCache) {
        const entry = cache.get(key);
        if (entry && Date.now() - entry.timestamp < TTL) return entry.value;
    }
    const value = await db.get(key);
    if (useCache) cache.set(key, { value, timestamp: Date.now() });
    return value;
}

async function setCached(key, value) {
    await db.set(key, value);
    cache.set(key, { value, timestamp: Date.now() });
}

async function deleteCached(key) {
    await db.delete(key);
    cache.delete(key);
}

const cacheCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (now - entry.timestamp > TTL) cache.delete(key);
    }
}, 60000);
cacheCleanupTimer.unref();

// ── Guild data hot cache ──
// Caches EVERY guild-scoped key under one Map entry.
// Immortal — only invalidated by writes or explicit call.
// This means GET endpoints hit 0 DB reads after the first request per guild.
const guildDataCache = new Map();
const GUILD_CONFIG_KEYS = [
    'automod', 'welcome', 'logging', 'djrole', 'xp_enabled',
    'giveaways', 'commands_enabled', 'tickets', 'rewards',
    'custom_filters', 'autoresponder', 'verification', 'security', 'locale',
    'xp_multiplier', 'xp_ignored_channels', 'webhook_logs',
    'tempbans', 'autoplay', '247', 'opentickets'
];

async function getGuildData(guildId) {
    let data = guildDataCache.get(guildId);
    if (data) return data;

    const promises = GUILD_CONFIG_KEYS.map(k => db.get(`${k}_${guildId}`));
    const results = await Promise.all(promises);
    data = {};
    GUILD_CONFIG_KEYS.forEach((k, i) => { data[k] = results[i]; });
    guildDataCache.set(guildId, data);
    if (guildDataCache.size > GUILD_CACHE_MAX) {
        const firstKey = guildDataCache.keys().next().value;
        guildDataCache.delete(firstKey);
    }
    return data;
}

function invalidateGuildData(guildId) {
    guildDataCache.delete(guildId);
}

const GUILD_CACHE_MAX = 500;
function getGuildDataSize() {
    return guildDataCache.size;
}

// ── User data cache ──
// xp_${guildId}_${userId}, stats_${guildId}_${userId}, warnings_${guildId}_${userId}
// 60 second TTL since these change frequently.
const userCache = new Map();
const USER_TTL = 60000;

async function getUserData(guildId, userId) {
    const key = `${guildId}_${userId}`;
    const entry = userCache.get(key);
    if (entry && Date.now() - entry.timestamp < USER_TTL) return entry;

    const [xp, stats, warnings] = await Promise.all([
        db.get(`xp_${guildId}_${userId}`),
        db.get(`stats_${guildId}_${userId}`),
        db.get(`warnings_${guildId}_${userId}`)
    ]);
    const data = {
        xp: xp || { textLevel: 0, textXp: 0 },
        stats: stats || { messages: 0, voiceTime: 0 },
        warnings: warnings || []
    };
    userCache.set(key, { ...data, timestamp: Date.now() });
    return data;
}

function invalidateUserCache(guildId, userId) {
    userCache.delete(`${guildId}_${userId}`);
}

function clearUserCache() {
    userCache.clear();
}

// ── Prefix-scan cache (db.all() snapshot) ──
let allSnapshot = null;
let allSnapshotAt = 0;
const ALL_TTL = 2000;

async function getAllCached() {
    if (allSnapshot && Date.now() - allSnapshotAt < ALL_TTL) return allSnapshot;
    allSnapshot = await db.all();
    allSnapshotAt = Date.now();
    return allSnapshot;
}

function invalidateAllCache() {
    allSnapshot = null;
    allSnapshotAt = 0;
}

const userCacheCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of userCache) {
        if (val.timestamp && now - val.timestamp > USER_TTL) userCache.delete(key);
    }
}, 30000);
userCacheCleanupTimer.unref();

module.exports = {
    db, getCached, setCached, deleteCached,
    getGuildData, invalidateGuildData,
    getUserData, invalidateUserCache, clearUserCache,
    getAllCached, invalidateAllCache
};