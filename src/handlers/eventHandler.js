const fs = require('fs');
const path = require('path');

/**
 * Loads all event modules from src/events/ and registers them on the client.
 *
 * Each event file must export:
 *   { name: string, once: boolean, execute: async (client, ...args) => void }
 *
 * @param {import('discord.js').Client} client - The Discord client
 */
function loadEvents(client) {
  const eventsDir = path.join(__dirname, '..', 'events');

  // Guard: if the events folder doesn't exist yet, warn and bail
  if (!fs.existsSync(eventsDir)) {
    console.log('⚠️  Dossier src/events/ introuvable — aucun événement chargé.');
    return;
  }

  const eventFiles = fs.readdirSync(eventsDir).filter((file) => file.endsWith('.js'));
  let loadedCount = 0;

  for (const file of eventFiles) {
    const filePath = path.join(eventsDir, file);

    try {
      // Clear require cache so hot-reloads work during development
      delete require.cache[require.resolve(filePath)];
      const event = require(filePath);

      // Basic validation
      if (!event.name || typeof event.execute !== 'function') {
        console.log(`⚠️  Événement ignoré (name ou execute manquant) : ${file}`);
        continue;
      }

      // Register as a one-time or persistent listener
      if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
      }

      console.log(`📦 Événement chargé : ${event.name}${event.once ? ' (once)' : ''}`);
      loadedCount++;
    } catch (error) {
      console.error(`❌ Erreur lors du chargement de l'événement ${file} :`, error);
    }
  }

  console.log(`✅ ${loadedCount} événement(s) chargé(s) avec succès.`);
}

module.exports = { loadEvents };
