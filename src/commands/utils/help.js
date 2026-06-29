// ─── CoinsBot — Commande: help ───────────────────────────────────────────────
// Affiche toutes les commandes groupées par catégorie, ou les détails d'une commande.

const { createEmbed, COLORS } = require('../../utils/embed');
const { getCommand } = require('../../handlers/commandHandler');
const config = require('../../config');

// Métadonnées d'affichage par catégorie
const CATEGORY_META = {
    economy:    { emoji: '💰', name: 'Économie & Banque' },
    work:       { emoji: '💼', name: 'Travail & Illégal' },
    casino:     { emoji: '🎰', name: 'Casino & Mini-Jeux' },
    enterprise: { emoji: '🏭', name: 'Entreprises & Tycoon' },
    crypto:     { emoji: '📈', name: 'Bourse & Crypto' },
    teams:      { emoji: '⚔️', name: 'Alliances & Guerre' },
    rpg:        { emoji: '🃏', name: 'RPG & Cartes' },
    admin:      { emoji: '🛡️', name: 'Administration' },
    utils:      { emoji: '🔧', name: 'Utilitaires' },
};

module.exports = {
    name: 'help',
    aliases: ['h', 'aide', 'commandes', 'cmds'],
    category: 'utils',
    description: 'Affiche la liste des commandes disponibles.',
    usage: '&help [commande]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const prefix = config.defaultPrefix;

        // ── Détail d'une commande spécifique ────────────────────────────────
        if (args[0]) {
            const cmd = getCommand(client, args[0].toLowerCase());
            if (!cmd) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Commande introuvable`,
                        description: `Aucune commande trouvée pour \`${args[0]}\`.\nUtilisez \`${prefix}help\` pour la liste complète.`,
                    })],
                });
            }

            const cooldownSec = cmd.cooldown ? (cmd.cooldown / 1000).toFixed(1) : '3.0';
            const meta = CATEGORY_META[cmd.category] || { emoji: '📦', name: cmd.category };

            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.INFO,
                    title: `📖 Aide — ${prefix}${cmd.name}`,
                    fields: [
                        { name: '📝 Description', value: cmd.description || 'Aucune description.', inline: false },
                        { name: '💡 Utilisation', value: `\`${cmd.usage || `${prefix}${cmd.name}`}\``, inline: true },
                        { name: `${meta.emoji} Catégorie`, value: meta.name, inline: true },
                        { name: '⏱️ Cooldown', value: `${cooldownSec}s`, inline: true },
                        { name: '🏷️ Alias', value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'Aucun', inline: true },
                        { name: '🔒 Permissions', value: `\`${cmd.permissions || 'everyone'}\``, inline: true },
                    ],
                })],
            });
        }

        // ── Liste de toutes les commandes ───────────────────────────────────
        const categories = {};
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.name);
        });

        // Ordre d'affichage souhaité
        const order = ['economy', 'work', 'casino', 'enterprise', 'crypto', 'teams', 'rpg', 'admin', 'utils'];
        const fields = [];

        for (const cat of order) {
            if (!categories[cat]) continue;
            const meta = CATEGORY_META[cat] || { emoji: '📦', name: cat };
            fields.push({
                name: `${meta.emoji} ${meta.name}`,
                value: categories[cat].map(c => `\`${c}\``).join('  '),
                inline: false,
            });
            delete categories[cat];
        }

        // Ajouter les catégories restantes non listées
        for (const [cat, cmds] of Object.entries(categories)) {
            const meta = CATEGORY_META[cat] || { emoji: '📦', name: cat };
            fields.push({
                name: `${meta.emoji} ${meta.name}`,
                value: cmds.map(c => `\`${c}\``).join('  '),
                inline: false,
            });
        }

        const totalCommands = client.commands.size;
        const totalAliases = client.aliases.size;

        message.reply({
            embeds: [createEmbed({
                color: COLORS.INFO,
                title: '📚 Commandes de CoinsBot',
                description: [
                    `Utilisez \`${prefix}help <commande>\` pour plus de détails.`,
                    `[📩 Inviter le bot](${config.inviteLink})`,
                    '',
                    `> **${totalCommands}** commandes • **${totalAliases}** alias`,
                ].join('\n'),
                thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 256 }),
                fields,
            })],
        });
    },
};
