const express = require('express');
const session = require('express-session');
const path = require('path');
const compression = require('compression');
const crypto = require('crypto');
const logger = require('../utils/logger');
const emojis = require('../utils/emojis');

const app = express();
const BASE_PORT = parseInt(process.env.DASHBOARD_PORT, 10) || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security Cache ──
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 200;

// Stricter rate limiter for auth routes (20 req/min)
function authRateLimiter(req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
    const now = Date.now();
    const limit = rateLimits.get(`auth:${ip}`) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

    if (now > limit.resetAt) {
        limit.count = 1;
        limit.resetAt = now + RATE_LIMIT_WINDOW;
    } else {
        limit.count++;
    }

    rateLimits.set(`auth:${ip}`, limit);
    if (limit.count > 20) {
        res.setHeader('Retry-After', Math.ceil((limit.resetAt - now) / 1000));
        return res.status(429).json({ error: 'Too many auth requests' });
    }
    next();
}

function rateLimiter(req, res, next) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
    const now = Date.now();
    const limit = rateLimits.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

    if (now > limit.resetAt) {
        limit.count = 1;
        limit.resetAt = now + RATE_LIMIT_WINDOW;
    } else {
        limit.count++;
    }

    rateLimits.set(ip, limit);
    if (limit.count > RATE_LIMIT_MAX) {
        res.setHeader('Retry-After', Math.ceil((limit.resetAt - now) / 1000));
        return res.status(429).json({ error: 'Too many requests' });
    }
    next();
}

const rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, limit] of rateLimits.entries()) {
        if (now > limit.resetAt + (30 * 60 * 1000)) rateLimits.delete(ip);
    }
}, 15 * 60 * 1000);
rateLimitCleanupTimer.unref();

app.disable('x-powered-by');

const sessionSecret = process.env.SESSION_SECRET || (() => {
    logger.warn('SESSION_SECRET not set — sessions will reset on each restart');
    return crypto.randomBytes(32).toString('hex');
})();

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 86400000, sameSite: 'Lax' }
}));

app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 0,
    etag: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
app.use(express.json());
app.use(rateLimiter);

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// ── CSRF Protection ──
function generateCsrfToken() {
    return crypto.randomBytes(32).toString('hex');
}

function csrfMiddleware(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCsrfToken();
    }

    const headerToken = req.headers['x-csrf-token'];
    const bodyToken = req.body?._csrf;

    if (headerToken && headerToken === req.session.csrfToken) return next();
    if (bodyToken && bodyToken === req.session.csrfToken) return next();

    const referer = req.headers['referer'] || req.headers['origin'];
    const allowedOrigin = process.env.DASHBOARD_ORIGIN || `http://localhost:${BASE_PORT}`;
    if (referer) {
        try {
            const parsed = new URL(referer);
            const allowed = new URL(allowedOrigin);
            if (parsed.origin === allowed.origin) return next();
        } catch (_) {}
    }

    return res.status(403).json({ error: 'CSRF validation failed' });
}

app.use(csrfMiddleware);

function startDashboard(botClient) {
    const authRouter = require('./routes/auth')(botClient);
    const statsRouter = require('./routes/stats')(botClient);
    const guildsRouter = require('./routes/guilds')(botClient);
    const musicRouter = require('./routes/music')(botClient);

    app.use('/api/stats', statsRouter);
    app.use('/api/auth', authRateLimiter, authRouter);
    app.use('/api/guild/:guildId', guildsRouter);
    app.use('/api/music/:guildId', musicRouter);

    app.get('/api/guilds', (req, res) => {
        try {
            if (!botClient || !botClient.user) return res.status(503).json({ error: 'Bot is initializing' });
            const guilds = botClient.guilds.cache.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.iconURL({ size: 128 }),
                memberCount: g.memberCount
            }));
            res.json(guilds);
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    app.get('/api/me', (req, res) => {
        try {
            if (req.session.user) return res.json(req.session.user);
            if (!botClient || !botClient.user) return res.json({ username: 'Not Connected', avatar: null });
            const app_ = botClient.application;
            const owner = app_?.owner?.user || botClient.user;
            res.json({
                username: owner.username,
                tag: owner.username || 'Bot Admin',
                avatar: owner.displayAvatarURL ? owner.displayAvatarURL({ size: 128 }) : null
            });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    app.get('/api/bot/presence', (req, res) => {
        try {
            if (!botClient || !botClient.user) return res.status(503).json({ error: 'Bot is initializing' });
            const presence = botClient.user.presence;
            res.json({
                status: presence?.status || 'online',
                activities: presence?.activities?.map(a => ({ type: a.type, name: a.name })) || []
            });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    app.get('/api/auth/csrf-token', (req, res) => {
        if (!req.session.csrfToken) {
            req.session.csrfToken = generateCsrfToken();
        }
        res.json({ csrfToken: req.session.csrfToken });
    });

    app.post('/api/bot/presence', (req, res) => {
        if (!botClient || !botClient.user) return res.status(503).json({ error: 'Bot is initializing' });
        const { status, activityType, activityText } = req.body;
        try {
            botClient.user.setPresence({
                status: status || 'online',
                activities: activityText ? [{ name: activityText, type: parseInt(activityType) || 0 }] : []
            });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    function tryListen(port) {
        const server = app.listen(port, () => {
            logger.info(`${emojis.sparkles} Dashboard Smooth Mode active at http://localhost:${port}`);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && port < BASE_PORT + 10) {
                logger.warn(`Port ${port} in use, trying ${port + 1}...`);
                tryListen(port + 1);
            } else {
                logger.error('Dashboard failed to start', { error: isDev ? err.message : 'Internal server error' });
            }
        });
    }
    tryListen(BASE_PORT);
}

module.exports = { startDashboard };
