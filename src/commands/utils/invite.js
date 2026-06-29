// ─── CoinsBot — Commande: invite ─────────────────────────────────────────────
// Affiche le lien d'invitation du bot avec des statistiques.

const { createEmbed, COLORS } = require('../../utils/embed');
const { formatNumber } = require('../../utils/formatters');
const config = require('../../config');

module.exports = {
    name: 'invite',
    aliases: ['inv', 'lien'],
    category: 'utils',
    description: 'Obtenir le lien d\'invitation du bot.',
    usage: '&invite',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const guildCount = client.guilds.cache.size;
        const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

        message.reply({
            embeds: [createEmbed({
                color: COLORS.INFO,
                title: '📩 Inviter CoinsBot',
                description: [
                    `**[➕ Ajouter à votre serveur](${config.inviteLink})**`,
                    '',
                    'CoinsBot est un bot complet d\'économie, RPG et gestion',
                    'multijoueur pour votre serveur Discord.',
                    '',
                    '> 💰 Économie réaliste • 🎰 Casino • ⚔️ Alliances',
                    '> 🏭 Entreprises • 📈 Crypto • 🃏 Cartes',
                ].join('\n'),
                thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 256 }),
                fields: [
                    { name: '🌐 Serveurs', value: formatNumber(guildCount), inline: true },
                    { name: '👥 Utilisateurs', value: formatNumber(userCount), inline: true },
                    { name: '📦 Commandes', value: formatNumber(client.commands.size), inline: true },
                ],
            })],
        });
    },
};
