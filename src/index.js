/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║                    🪙 CoinsBot                        ║
 * ║     Bot Discord d'Économie, RPG & Gestion MMO        ║
 * ║                                                       ║
 * ║  Discord.js v14 • SQLite • Sequelize                  ║
 * ╚═══════════════════════════════════════════════════════╝
 * 
 * @description Point d'entrée principal du bot
 * @author msm691
 */

// Load environment variables FIRST
require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initDatabase } = require('./database/connection');

// ─── Validate Token ─────────────────────────────────────
if (!config.token) {
    console.error('\x1b[31m✖ ERREUR FATALE: BOT_TOKEN manquant dans le fichier .env\x1b[0m');
    console.error('\x1b[33m  → Créez un fichier .env avec BOT_TOKEN=votre_token\x1b[0m');
    process.exit(1);
}

// ─── Create Discord Client ─────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
    // Anti-spam: limit message cache
    sweepers: {
        messages: {
            interval: 300,    // Every 5 minutes
            lifetime: 600,    // Keep for 10 minutes
        },
    },
});

// ─── Attach config to client for global access ─────────
client.config = config;

// ─── Initialize Bot ─────────────────────────────────────
async function startBot() {
    try {
        console.log('\x1b[36m');
        console.log('  ╔═══════════════════════════════════════╗');
        console.log('  ║         🪙  CoinsBot v1.0.0           ║');
        console.log('  ║    Économie • RPG • Gestion MMO       ║');
        console.log('  ╚═══════════════════════════════════════╝');
        console.log('\x1b[0m');

        // Step 1: Initialize database
        console.log('\x1b[33m⏳ Initialisation de la base de données...\x1b[0m');
        await initDatabase();
        console.log('\x1b[32m✅ Base de données prête\x1b[0m\n');

        // Step 2: Load command handler (with alias support)
        console.log('\x1b[33m⏳ Chargement des commandes...\x1b[0m');
        loadCommands(client);
        console.log('');

        // Step 3: Load event handler
        console.log('\x1b[33m⏳ Chargement des événements...\x1b[0m');
        loadEvents(client);
        console.log('');

        // Step 4: Login to Discord
        console.log('\x1b[33m⏳ Connexion à Discord...\x1b[0m');
        await client.login(config.token);

    } catch (error) {
        console.error('\x1b[31m✖ ERREUR FATALE lors du démarrage:\x1b[0m', error);
        process.exit(1);
    }
}

// ─── Error Handlers ─────────────────────────────────────
process.on('unhandledRejection', (error) => {
    console.error('\x1b[31m✖ Unhandled Rejection:\x1b[0m', error);
});

process.on('uncaughtException', (error) => {
    console.error('\x1b[31m✖ Uncaught Exception:\x1b[0m', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\x1b[33m⚠️ Arrêt du bot en cours...\x1b[0m');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\x1b[33m⚠️ Arrêt du bot en cours...\x1b[0m');
    client.destroy();
    process.exit(0);
});

// ─── Start ──────────────────────────────────────────────
startBot();
