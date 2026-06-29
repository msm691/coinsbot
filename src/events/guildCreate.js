// ─── CoinsBot — guildCreate Event ────────────────────────────────────────────
// Fired when the bot is added to a new Discord server.

const { ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'guildCreate',
  once: false,

  /**
   * @param {import('discord.js').Client}       client
   * @param {import('discord.js').Guild}        guild
   */
  async execute(client, guild) {
    // ── Log the new guild ────────────────────────────────────────────────────
    console.log(
      `📥 Joined new guild: ${guild.name} (${guild.id}) — ${guild.memberCount} members`,
    );

    // ── Create a default database entry for this guild ───────────────────────
    try {
      // Will be implemented when Guild model is available
      // await Guild.findOrCreate({
      //   where: { guildId: guild.id },
      //   defaults: {
      //     guildName: guild.name,
      //     prefix: config.defaultPrefix,
      //   },
      // });
    } catch (error) {
      console.error(
        `[ERREUR] Impossible de créer l'entrée pour le serveur ${guild.name} :`,
        error.stack || error,
      );
    }

    // ── Update bot presence with the new guild count ─────────────────────────
    const guildCount = client.guilds.cache.size;

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
