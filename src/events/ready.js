// ─── CoinsBot — Ready Event ──────────────────────────────────────────────────
// Fires once when the bot successfully connects to Discord.

const { ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'ready',
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    // ── ASCII art banner ─────────────────────────────────────────────────────
    const cyan    = '\x1b[36m';
    const yellow  = '\x1b[33m';
    const green   = '\x1b[32m';
    const reset   = '\x1b[0m';

    console.log(cyan);
    console.log('  ██████╗ ██████╗ ██╗███╗   ██╗███████╗██████╗  ██████╗ ████████╗');
    console.log('  ██╔════╝██╔═══██╗██║████╗  ██║██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝');
    console.log('  ██║     ██║   ██║██║██╔██╗ ██║███████╗██████╔╝██║   ██║   ██║   ');
    console.log('  ██║     ██║   ██║██║██║╚██╗██║╚════██║██╔══██╗██║   ██║   ██║   ');
    console.log('  ╚██████╗╚██████╔╝██║██║ ╚████║███████║██████╔╝╚██████╔╝   ██║   ');
    console.log('   ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝╚═════╝  ╚═════╝    ╚═╝   ');
    console.log(reset);

    // ── Bot information ──────────────────────────────────────────────────────
    const guildCount   = client.guilds.cache.size;
    const commandCount = client.commands ? client.commands.size : 0;

    console.log(`${green}  ✔ Connecté en tant que : ${yellow}${client.user.tag}${reset}`);
    console.log(`${green}  ✔ Commandes chargées   : ${yellow}${commandCount}${reset}`);
    console.log(`${green}  ✔ Serveurs             : ${yellow}${guildCount}${reset}`);
    console.log(`${cyan}  ─────────────────────────────────────────────────────────────${reset}\n`);

    // ── Set bot activity / presence ──────────────────────────────────────────
    client.user.setPresence({
      activities: [
        {
          name: `${config.defaultPrefix}help | ${guildCount} serveurs`,
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });
  },
};
