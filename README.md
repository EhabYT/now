# EB Bot — Discord All-in-One Bot

Professional Discord bot mit Moderation, Music, Tickets, Economy, AutoMod und Web-Dashboard.

## Features

### Moderation & AutoMod
- AutoMod: Spam-, Profanity-, Link-, CAPS-, Emoji- und Mention-Schutz
- Whitelist für Rollen/User/Channels
- Automatische Timeouts nach Violations
- Manuelle Moderation: `/kick`, `/ban`, `/unban`, `/timeout`, `/warn`, `/clear`
- Umfassendes Logging (Messages, Members, Channels, Moderation, Voice, Threads)

### Music System
- High Quality Audio via `discord-player`
- `/music-setup` für permanenten Control-Channel
- Interaktive Buttons (Pause, Skip, Stop, Shuffle, Loop, Volume)
- Echtzeit-Audio-Filter (Bassboost, Nightcore, etc.)
- 24/7 Mode, Autoplay

### Tickets
- Private Support-Channel pro User
- `/setup`, `/panel`, `/new`, `/close`, `/add`, `/remove`, `/claim`, `/transcript`
- Automatische Transkripte beim Schließen

### Economy & Leveling
- Points-System, Leaderboards, Reputation
- XP/Leveling mit Text- und Voice-Tracking
- Level-Belohnungen (automatische Rollen)

### Dashboard
- Web-Dashboard via Express (`http://localhost:3000`)
- Guild-Übersicht, Logging-Konfiguration, Member-Management
- Music-Steuerung, Giveaway-Erstellung, Backup/Restore

## Quick Start

```bash
# Dependencies installieren
npm install

# .env konfigurieren (siehe .env.example)
# DISCORD_TOKEN, CLIENT_ID, DISCORD_CLIENT_SECRET eintragen

# Bot starten
npm start

# Dashboard separat starten
npm run dashboard

# Commands manuell deployen
npm run deploy
```

### Zero-Dep Ticket Bot (optional)

`ticket_bot.js` — ein standalone Ticket-System **ohne npm dependencies**.
Nur Node.js built-ins (http, fs, crypto). Einfach Token/Key setzen und starten:

```bash
set DISCORD_TOKEN=...
set DISCORD_PUBLIC_KEY=...
set APPLICATION_ID=...
node ticket_bot.js
```

## Environment (.env)

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot Token |
| `CLIENT_ID` | ✅ | Discord Application ID |
| `DISCORD_CLIENT_SECRET` | ✅ | OAuth2 Secret (Dashboard) |
| `GUILD_ID` | | Für instant Command-Deployment |
| `SESSION_SECRET` | | Dashboard Session Key |
| `GENIUS_API_KEY` | | Lyrics-Feature |
| `LOG_LEVEL` | | DEBUG/INFO/WARN/ERROR |

## Commands (95 Slash Commands)

| Kategorie | Commands |
|---|---|
| **Moderation** | `kick`, `ban`, `unban`, `timeout`, `untimeout`, `warn`, `clear`, `vmute`, `unvmute`, `setnick`, `lock`, `unlock`, `slowmode` |
| **Music** | `play`, `skip`, `stop`, `pause`, `resume`, `queue`, `nowplaying`, `loop`, `shuffle`, `volume`, `filters`, `lyrics`, `music-setup`, `autoplay`, `247` |
| **Tickets** | `setup`, `panel`, `new`, `close`, `open`, `delete`, `rename`, `add`, `remove`, `claim`, `transcript`, `closerequest` |
| **Economy** | `points`, `leaderboard`, `rep`, `rewards`, `vote` |
| **Giveaway** | `giveaway start`, `giveaway end`, `giveaway reroll`, `giveaway list` |
| **Utility** | `help`, `ping`, `serverinfo`, `userinfo`, `avatar`, `id`, `info`, `invite`, `poll`, `remind`, `stats`, `serverstats`, `debug`, `permissionlevel`, `premium`, `commands`, `locale`, `reactionrole` |
| **Admin** | `setupverification`, `automod`, `whitelist`, `logging`, `purge`, `panel`, `embed` |

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** discord.js v14, Express 5
- **Music:** discord-player, @discordjs/opus, play-dl
- **Database:** quick.db (SQLite via better-sqlite3)
- **Dashboard:** Express, express-session, compression
- **Auth:** Discord OAuth2

## License

MIT
