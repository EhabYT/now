const { MessageFlags } = require('discord.js');
const { checkDJPerms, safeReply } = require('./helpers');
const logger = require('./logger');

async function handleMusicButton(i, player, db) {
    const queue = player.nodes.get(i.guild.id);
    if (!queue || !queue.isPlaying()) return await safeReply(i, { content: ' Nothing playing.', flags: [MessageFlags.Ephemeral] });
    if (!(await checkDJPerms(i, db))) return await safeReply(i, { content: ' DJ role required.', flags: [MessageFlags.Ephemeral] });

    try {
        switch (i.customId) {
            case 'music_pause_resume':
                queue.node.setPaused(!queue.node.isPaused());
                await safeReply(i, { content: queue.node.isPaused() ? 'Paused' : 'Resumed', flags: [MessageFlags.Ephemeral] });
                break;
            case 'music_skip':
                await queue.node.skip();
                await safeReply(i, { content: 'Skipped!', flags: [MessageFlags.Ephemeral] });
                break;
            case 'music_stop':
                await queue.delete();
                await safeReply(i, { content: 'Stopped!', flags: [MessageFlags.Ephemeral] });
                break;
            case 'music_shuffle':
                queue.tracks.shuffle();
                await safeReply(i, { content: 'Shuffled!', flags: [MessageFlags.Ephemeral] });
                break;
            case 'music_loop': {
                const next = (queue.repeatMode + 1) % 4;
                await queue.setRepeatMode(next);
                await safeReply(i, { content: `Loop: ${next}`, flags: [MessageFlags.Ephemeral] });
                break;
            }
            case 'music_voldown':
                await queue.node.setVolume(Math.max(0, queue.node.volume - 10));
                await safeReply(i, { content: `Volume: ${queue.node.volume}`, flags: [MessageFlags.Ephemeral] });
                break;
            case 'music_volup':
                await queue.node.setVolume(Math.min(200, queue.node.volume + 10));
                await safeReply(i, { content: `Volume: ${queue.node.volume}`, flags: [MessageFlags.Ephemeral] });
                break;
        }
    } catch (err) {
        logger.error('Music btn error', { error: err.message });
        await safeReply(i, { content: `Error: ${err.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => { });
    }
}

async function handleMusicFilterSelect(i, player, db) {
    const queue = player.nodes.get(i.guild.id);
    if (!queue || !queue.isPlaying()) return await safeReply(i, { content: ' Nothing playing.', flags: [MessageFlags.Ephemeral] });
    if (!(await checkDJPerms(i, db))) return await safeReply(i, { content: ' DJ role required.', flags: [MessageFlags.Ephemeral] });

    const selection = i.values[0];
    await i.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
    try {
        if (selection === 'clear') {
            queue.filters.ffmpeg.setFilters(false);
            return await safeReply(i, { content: 'Filters cleared!' });
        }
        await queue.filters.ffmpeg.toggle([selection]);
        await safeReply(i, { content: `Filter ${selection} toggled!` });
    } catch (err) {
        logger.error('Filter error', { error: err.message });
        await safeReply(i, { content: `Failed: ${err.message}` });
    }
}

module.exports = { handleMusicButton, handleMusicFilterSelect };
