require('dotenv').config();
const emojis = require('./utils/emojis');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { db } = require('./utils/db');

const logger = require('./utils/logger');
const scheduler = require('./scheduler');
const { loadEvents } = require('./events');
const { registerJobs } = require('./scheduler/jobs');
const { deployCommands, runDiagnostics } = require('./utils/startup');
const { startDashboard } = require('./dashboard/server');

// Global Error Handlers
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

// Attach properties to client
client.commands = new Collection();
client.db = db;
client.helpers = require('./utils/helpers');

// Initialize Music Player
const player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    filter: 'audioonly'
  }
});

client.player = player;

// Kill any stale dashboard process on our port
const DASHBOARD_PORT = String(process.env.DASHBOARD_PORT || '3000').replace(/\D/g, '') || '3000';
try {
  let pid = null;
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano | findstr :${DASHBOARD_PORT}`).toString();
    const lines = output.split('\n').filter(l => l.includes('LISTENING'));
    if (lines.length > 0) {
      pid = lines[0].trim().split(/\s+/).pop();
    }
  } else {
    try {
      pid = execSync(`lsof -ti :${DASHBOARD_PORT} 2>/dev/null`).toString().trim();
    } catch (_) {
      pid = execSync(`fuser ${DASHBOARD_PORT}/tcp 2>/dev/null`).toString().trim();
    }
  }
  if (pid && /^\d+$/.test(pid)) {
    const method = process.platform === 'win32' ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
    execSync(method, { stdio: 'ignore' });
  }
} catch (_) {}

// Graceful Shutdown
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully...`);

  scheduler.removeAll();
  try { client.destroy(); } catch (_) {}

  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const categories = fs.readdirSync(commandsPath);
  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(categoryPath, file));
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          logger.debug(`Loaded command: ${command.data.name}`);
        }
      } catch (err) {
        logger.error(`Load error for command ${file}`, { error: err.message });
      }
    }
  }
}

// Startup Logic
(async () => {
  // Run Diagnostics
  if (!(await runDiagnostics(db))) {
    logger.error('Startup diagnostics failed. Shutting down...');
    process.exit(1);
  }

  // Load Music Extractors
  try {
    const { DefaultExtractors } = require('@discord-player/extractor');
    await player.extractors.loadMulti(DefaultExtractors);
    logger.info('Music extractors loaded');
  } catch (err) {
    logger.error('Extractor error', { error: err.message });
  }

  // Register Events
  try {
    loadEvents(client);
  } catch (err) {
    logger.error('Failed to load events', { error: err.message });
  }

  // Register Scheduler Jobs
  try {
    registerJobs(client, scheduler);
  } catch (err) {
    logger.error('Failed to register scheduler jobs', { error: err.message });
  }

  // Deploy Commands
  if (process.env.DEPLOY_COMMANDS === 'true' || !process.env.GUILD_ID) {
    await deployCommands(process.env.DISCORD_TOKEN, process.env.CLIENT_ID, process.env.GUILD_ID || null);
  }

  // Pro Features & Experimental Upgrades
  if (process.env.UPGRADE_MODE === 'true') {
    logger.info('' + emojis.rocket + ' Upgrade Mode Enabled: High-performance event handlers active.');
    client.setMaxListeners(25);
  }

  // Login
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    logger.error('Login failed', { error: err.message });
    process.exit(1);
  }

  // Start Dashboard
  try {
    startDashboard(client);
  } catch (err) {
    logger.error('Dashboard failed to start', { error: err.message });
  }
})();
