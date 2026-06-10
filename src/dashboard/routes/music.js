const express = require('express');
const router = express.Router({ mergeParams: true });
const { QueueRepeatMode } = require('discord-player');
const { Client: GeniusClient } = require('genius-lyrics');
const { ChannelType } = require('discord.js');
const { db } = require('../../utils/db');
const genius = new GeniusClient(process.env.GENIUS_API_KEY || '');
const isDev = process.env.NODE_ENV !== 'production';

module.exports = (botClient) => {
    // ── Middleware: Session Auth + Guild Access ──
    async function requireAuth(req, res, next) {
        if (!req.session?.user?.id) return res.status(401).json({ error: 'Not authenticated' });
        next();
    }

    async function validateGuild(req, res, next) {
        if (!botClient) return res.status(503).json({ error: 'Bot is initializing' });
        const guild = botClient.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Server not found' });
        req.guild = guild;
        next();
    }

    router.use(requireAuth, validateGuild);

    router.get('/', async (req, res) => {
        try {
            if (!botClient.player) return res.json({ playing: false });
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue || !queue.isPlaying()) return res.json({ playing: false });

            const track = queue.currentTrack;
            const progress = queue.node.getTimestamp();

            res.json({
                playing: true,
                current: {
                    title: track.title,
                    author: track.author,
                    duration: track.duration,
                    url: track.url,
                    thumbnail: track.thumbnail,
                    position: progress ? progress.current.label : '0:00',
                    progress: progress ? Math.round(progress.progress) : 0,
                    source: track.raw?.source || (track.url?.includes('spotify') ? 'spotify' : 'youtube')
                },
                queue: queue.tracks.toArray().slice(0, 10).map(t => ({
                    title: t.title,
                    author: t.author,
                    duration: t.duration,
                    source: t.raw?.source || (t.url?.includes('spotify') ? 'spotify' : 'youtube')
                })),
                volume: queue.node.volume,
                filters: queue.filters.ffmpeg.getFiltersEnabled()
            });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/pause', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            await queue.node.setPaused(!queue.node.isPaused());
            res.json({ paused: queue.node.isPaused() });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/skip', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            await queue.node.skip();
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/stop', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            await queue.delete();
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/shuffle', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            queue.tracks.shuffle();
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/clear', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            queue.tracks.clear();
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/volume', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            const volume = parseInt(req.body.volume);
            if (isNaN(volume)) return res.status(400).json({ error: 'Invalid volume' });
            await queue.node.setVolume(Math.max(0, Math.min(100, volume)));
            res.json({ volume: queue.node.volume });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/filters', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            await queue.filters.ffmpeg.toggle(req.body.filter);
            res.json({ filters: queue.filters.ffmpeg.getFiltersEnabled() });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/queue/remove', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            const index = parseInt(req.body.index);
            if (isNaN(index) || index < 0) return res.status(400).json({ error: 'Invalid index' });
            const track = queue.tracks.toArray()[index];
            if (track) await queue.node.remove(track);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/search', async (req, res) => {
        try {
            if (!botClient.player) return res.status(500).json({ error: 'Player not ready' });
            if (!req.body.query || typeof req.body.query !== 'string' || req.body.query.length > 500) return res.status(400).json({ error: 'Invalid query' });
            const searchResult = await botClient.player.search(req.body.query);
            if (!searchResult?.hasTracks()) return res.json({ tracks: [] });
            res.json({
                tracks: searchResult.tracks.slice(0, 5).map(t => ({
                    title: t.title, author: t.author, url: t.url, thumbnail: t.thumbnail, duration: t.duration, source: t.raw?.source || (t.url?.includes('spotify') ? 'spotify' : 'youtube')
                }))
            });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/play-remote', async (req, res) => {
        try {
            if (!req.body.url || typeof req.body.url !== 'string' || req.body.url.length > 500) return res.status(400).json({ error: 'Invalid URL' });
            const voiceChannel = req.guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.members.size > 0);
            if (!voiceChannel) return res.status(400).json({ error: 'No active voice channel found' });
            await botClient.player.play(voiceChannel, req.body.url, { nodeOptions: { metadata: { channel: null } } });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/loop', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'Queue not found' });
            const mode = parseInt(req.body.mode);
            if (isNaN(mode) || mode < 0 || mode > 3) return res.status(400).json({ error: 'Invalid mode (0-3)' });
            await queue.setRepeatMode(mode);
            res.json({ success: true, mode });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.get('/lyrics', async (req, res) => {
        try {
            const searches = await genius.songs.search(req.query.query);
            if (!searches.length) return res.status(404).json({ error: 'No lyrics found' });
            const lyrics = await searches[0].lyrics();
            res.json({ title: searches[0].title, artist: searches[0].artist?.name || 'Unknown', lyrics, image: searches[0].image });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    router.post('/autoplay', async (req, res) => {
        try {
            const queue = botClient.player.nodes.get(req.params.guildId);
            if (!queue) return res.status(404).json({ error: 'No queue' });
            await queue.setRepeatMode(req.body.enabled ? QueueRepeatMode.AUTOPLAY : QueueRepeatMode.OFF);
            await db.set(`autoplay_${req.params.guildId}`, !!req.body.enabled);
            res.json({ success: true, mode: req.body.enabled ? 'autoplay' : 'off' });
        } catch (err) { res.status(500).json({ error: isDev ? err.message : 'Internal server error' }); }
    });

    return router;
};
