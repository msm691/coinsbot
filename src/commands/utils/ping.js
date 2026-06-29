// ─── CoinsBot — Commande: ping ───────────────────────────────────────────────
// Affiche la latence du bot (message, API WebSocket, base de données).

const { createEmbed, COLORS } = require('../../utils/embed');
const { sequelize } = require('../../database/models');

module.exports = {
    name: 'ping',
    aliases: ['pong', 'latence', 'ms'],
    category: 'utils',
    description: 'Affiche la latence du bot.',
    usage: '&ping',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        // Envoyer un message temporaire pour mesurer le round-trip
        const sent = await message.reply({
            embeds: [createEmbed({
                color: COLORS.INFO,
                title: '🏓 Calcul du ping...',
                description: '⏳ Mesure en cours...',
            })],
        });

        // Mesurer la latence de la base de données
        const dbStart = Date.now();
        try {
            await sequelize.authenticate();
        } catch { /* ignore */ }
        const dbPing = Date.now() - dbStart;

        // Calculer les latences
        const msgPing = sent.createdTimestamp - message.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);

        // Couleur dynamique selon la latence API
        let color = COLORS.SUCCESS;     // < 100ms → vert
        if (apiPing >= 200) color = COLORS.ERROR;       // >= 200ms → rouge
        else if (apiPing >= 100) color = COLORS.WARNING; // >= 100ms → orange

        // Indicateurs visuels
        const getIndicator = (ms) => {
            if (ms < 100) return '🟢';
            if (ms < 200) return '🟡';
            return '🔴';
        };

        await sent.edit({
            embeds: [createEmbed({
                color,
                title: '🏓 Pong !',
                fields: [
                    {
                        name: `${getIndicator(msgPing)} Message`,
                        value: `\`${msgPing}ms\``,
                        inline: true,
                    },
                    {
                        name: `${getIndicator(apiPing)} API WebSocket`,
                        value: `\`${apiPing}ms\``,
                        inline: true,
                    },
                    {
                        name: `${getIndicator(dbPing)} Base de données`,
                        value: `\`${dbPing}ms\``,
                        inline: true,
                    },
                ],
            })],
        });
    },
};
