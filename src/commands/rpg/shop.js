// ─── CoinsBot — Commande: shop ────────────────────────────────────────────────
const { Market } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const config = require('../../config');

const CAT_EMOJI   = { tool:'🔧', weapon:'⚔️', consumable:'🧪', collectible:'💎', special:'⭐' };
const RARITY_DOT  = { common:'⚪', uncommon:'🟢', rare:'🔵', epic:'🟣', legendary:'🟡' };
const VALID_CATS  = ['tool', 'weapon', 'consumable', 'collectible', 'special'];

module.exports = {
    name: 'shop',
    aliases: ['boutique', 'store', 'magasin', 'marche'],
    category: 'rpg',
    description: 'Afficher la boutique.',
    usage: '&shop [catégorie]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const catFilter = args[0]?.toLowerCase();
        const where = { is_buyable: true };
        if (catFilter && VALID_CATS.includes(catFilter)) where.category = catFilter;

        const items = await Market.findAll({ where, order: [['price', 'ASC']] });
        if (!items.length) return message.reply({ embeds: [createEmbed({ color: COLORS.INFO, description: 'Aucun article disponible.' })] });

        // Grouper par catégorie
        const grouped = {};
        for (const item of items) {
            if (!grouped[item.category]) grouped[item.category] = [];
            grouped[item.category].push(item);
        }

        const fields = [];
        for (const cat of VALID_CATS) {
            if (!grouped[cat]?.length) continue;
            if (fields.length >= 5) break;
            const lines = grouped[cat].slice(0, 6).map(i =>
                `${i.emoji} ${RARITY_DOT[i.rarity] || ''} **${i.item_name}** — ${formatMoney(i.price)}${i.level_required > 1 ? ` *(Nv.${i.level_required}+)*` : ''}`,
            );
            fields.push({ name: `${CAT_EMOJI[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, value: lines.join('\n'), inline: false });
        }

        message.reply({ embeds: [createEmbed({
            color: COLORS.INFO,
            title: '🏪 Boutique CoinsBot',
            description: `Achetez avec \`${config.defaultPrefix}buy <nom_article>\`\nFiltrez: \`${config.defaultPrefix}shop <catégorie>\` — \`${VALID_CATS.join('` · `')}\``,
            fields,
        })] });
    },
};
