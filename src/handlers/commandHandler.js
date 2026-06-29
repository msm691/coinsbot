const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CooldownManager } = require('../utils/cooldown');

/**
 * Resolves a command by name or alias.
 * Checks client.commands first, then falls back to client.aliases.
 * @param {import('discord.js').Client} client - The Discord client
 * @param {string} nameOrAlias - Command name or one of its aliases
 * @returns {object|undefined} The command object, or undefined if not found
 */
function getCommand(client, nameOrAlias) {
  const lower = nameOrAlias.toLowerCase();

  // Check direct command name first
  if (client.commands.has(lower)) {
    return client.commands.get(lower);
  }

  // Fall back to alias lookup
  const commandName = client.aliases.get(lower);
  if (commandName) {
    return client.commands.get(commandName);
  }

  return undefined;
}

/**
 * Recursively collects all .js file paths from a directory.
 * @param {string} dir - Absolute path to scan
 * @param {string[]} [files=[]] - Accumulator (internal)
 * @returns {string[]} Array of absolute file paths
 */
function readCommandFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories (category folders)
      readCommandFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Loads all commands from src/commands/ subdirectories and registers
 * them (with aliases) on the client.
 * @param {import('discord.js').Client} client - The Discord client
 */
function loadCommands(client) {
  // Initialise collections on the client
  client.commands = new Collection();
  client.aliases = new Collection();
  client.cooldowns = new CooldownManager();

  const commandsDir = path.join(__dirname, '..', 'commands');

  // Guard: if the commands folder doesn't exist yet, warn and bail
  if (!fs.existsSync(commandsDir)) {
    console.log('⚠️  Dossier src/commands/ introuvable — aucune commande chargée.');
    return;
  }

  const commandFiles = readCommandFiles(commandsDir);
  let aliasCount = 0;

  for (const filePath of commandFiles) {
    try {
      // Clear require cache so hot-reloads work during development
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);

      // Basic validation
      if (!command.name || typeof command.execute !== 'function') {
        console.log(`⚠️  Fichier ignoré (name ou execute manquant) : ${filePath}`);
        continue;
      }

      // Register command by its canonical name
      client.commands.set(command.name.toLowerCase(), command);

      // Register every alias → command name mapping
      if (Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          client.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
          aliasCount++;
        }
      }

      console.log(`📦 Commande chargée : ${command.name}`);
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de ${filePath} :`, error);
    }
  }

  console.log(`✅ ${client.commands.size} commande(s) et ${aliasCount} alias chargé(s) avec succès.`);
}

module.exports = { loadCommands, getCommand };
