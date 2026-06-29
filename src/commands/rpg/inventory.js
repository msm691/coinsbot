// ─── CoinsBot — Commande: inventory ──────────────────────────────────────────
const { Inventory } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');

const CAT_EMOJI = { tool:'🔧', weapon:'⚔️', consumable:'🧪', collectible:'💎', special:'⭐', other:'📦' };

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'sac', 'items', 'inventaire'],
    category: 'rpg',
    description: 'Afficher votre inventaire.',
    usage: '&inventory [@utilisateur]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const items = await Inventory.findAll({ where: { user_id: target.id }, order: [['item_name', 'ASC']] });

        if (!items.length) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO,
                title: '🎒 Inventaire vide',
                description: `Aucun objet. Achetez dans la boutique avec \`&shop\` puis \`&buy\`.`,
            })] });
        }

        // Grouper par catégorie (stockée en metadata)
        const groups = {};
        for (const item of items) {
            const cat = item.metadata?.category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        }

        const fields = Object.entries(groups).slice(0, 5).map(([cat, its]) => ({
            name: `${CAT_EMOJI[cat] || '📦'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
            value: its.map(i => `${i.metadata?.emoji || '📦'} **${i.item_name}** ×${i.quantity}${i.equipped ? ' *(équipé)*' : ''}`).join('\n'),
            inline: false,
        }));

        const totalQty = items.reduce((a, i) => a + i.quantity, 0);

        message.reply({ embeds: [createEmbed({
            color: COLORS.RPG,
            title: `🎒 Inventaire — ${target.username}`,
            description: `**${totalQty}** objet(s) au total, **${items.length}** type(s) unique(s).`,
            fields,
            thumbnail: target.displayAvatarURL({ dynamic: true }),
        })] });
    },
};
