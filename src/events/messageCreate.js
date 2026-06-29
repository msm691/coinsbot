// ─── CoinsBot — messageCreate Event ──────────────────────────────────────────
// Main command dispatch pipeline: prefix → parse → permissions → cooldown → run.

const config = require('../config');
const { getCommand } = require('../handlers/commandHandler');
const { createEmbed, COLORS } = require('../utils/embed');
const { checkPermission } = require('../utils/permissions');

module.exports = {
  name: 'messageCreate',
  once: false,

  /**
   * @param {import('discord.js').Client}  client
   * @param {import('discord.js').Message} message
   */
  async execute(client, message) {
    // 1. Ignore messages from bots
    if (message.author.bot) return;

    // 2. Ignore DMs — commands only work inside guilds
    if (!message.guild) return;

    // 3. Resolve guild prefix (database lookup with fallback)
    let prefix = config.defaultPrefix;
    try {
      const { Guild } = require('../database/models');
      const guildData = await Guild.findOne({ where: { id: message.guild.id } });
      if (guildData && guildData.prefix) prefix = guildData.prefix;
    } catch {
      // DB not ready yet — silently fall back to default prefix
    }

    // 4. Check if the message starts with the resolved prefix
    if (!message.content.startsWith(prefix)) return;

    // 5. Parse command name and arguments
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    // 6. Resolve command (supports aliases via getCommand)
    const command = getCommand(client, commandName);
    if (!command) return;

    // 7. Permission check
    const permResult = checkPermission(message.member, command.permissions || 'everyone');
    if (!permResult.allowed) {
      return message.reply({
        embeds: [
          createEmbed({
            color: COLORS.ERROR,
            title: `${config.emojis.error} Permissions insuffisantes`,
            description: permResult.message,
          }),
        ],
      });
    }

    // 8. Cooldown check (using the CooldownManager singleton on client)
    const cooldownMs = command.cooldown || 3000; // Default 3s cooldown
    const { onCooldown, remaining } = client.cooldowns.check(command.name, message.author.id, cooldownMs);

    if (onCooldown) {
      const seconds = (remaining / 1000).toFixed(1);
      return message.reply({
        embeds: [
          createEmbed({
            color: COLORS.WARNING,
            title: `${config.emojis.warning} Temps de recharge`,
            description: `Merci de patienter encore **${seconds}s** avant de réutiliser \`${prefix}${command.name}\`.`,
          }),
        ],
      });
    }

    // 9. Set cooldown for this command
    client.cooldowns.set(command.name, message.author.id, cooldownMs);

    // 10. Execute the command
    try {
      await command.execute(message, args, client);
    } catch (error) {
      // 11. Log the full error stack and notify the user
      console.error(`[ERREUR] Commande "${command.name}" :`, error.stack || error);

      message.reply({
        embeds: [
          createEmbed({
            color: COLORS.ERROR,
            title: `${config.emojis.error} Erreur`,
            description:
              'Une erreur est survenue lors de l\'exécution de cette commande. Veuillez réessayer plus tard.',
          }),
        ],
      }).catch(() => {});
    }
  },
};
