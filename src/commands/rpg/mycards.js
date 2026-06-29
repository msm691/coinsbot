// ─── CoinsBot — Commande: mycards ────────────────────────────────────────────
const { UserCard, Card } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');

const RARITY_ORDER  = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
const RARITY_EMOJI  = { common:'⚪', uncommon:'🟢', rare:'🔵', epic:'🟣', legendary:'🟡', mythic:'🔴' };
const RARITY_FRENCH = { common:'Commun', uncommon:'Peu commun', rare:'Rare', epic:'Épique', legendary:'Légendaire', mythic:'Mythique' };

module.exports = {
    name: 'mycards',
    aliases: ['cards', 'collection', 'mescards', 'cartes'],
    category: 'rpg',
    description: 'Afficher votre collection de cartes.',
    usage: '&mycards [@utilisateur]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;

        const userCards = await UserCard.findAll({
            where: { user_id: target.id },
            include: [{ model: Card, as: 'card' }],
        });

        if (!userCards.length) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO,
                title: '🃏 Collection vide',
                description: `Aucune carte. Utilisez \`&carddrop\` pour en obtenir !`,
            })] });
        }

        // Grouper par rareté (ordre décroissant)
        const grouped = {};
        for (const uc of userCards) {
            if (!uc.card) continue;
            const r = uc.card.rarity;
            if (!grouped[r]) grouped[r] = [];
            grouped[r].push(uc);
        }

        const fields = [];
        for (const rarity of RARITY_ORDER) {
            if (!grouped[rarity]?.length) continue;
            if (fields.length >= 6) break;
            fields.push({
                name: `${RARITY_EMOJI[rarity]} ${RARITY_FRENCH[rarity]} (${grouped[rarity].length})`,
                value: grouped[rarity].slice(0, 5).map(uc =>
                    `**${uc.card.name}** ×${uc.quantity} — ⚔️${uc.card.attack} 🛡️${uc.card.defense} 💨${uc.card.speed}`,
                ).join('\n'),
                inline: false,
            });
        }

        const totalCards = userCards.reduce((a, uc) => a + uc.quantity, 0);

        message.reply({ embeds: [createEmbed({
            color: COLORS.RPG,
            title: `🃏 Collection — ${target.username}`,
            description: `**${totalCards}** carte(s) au total · **${userCards.length}** type(s) unique(s).`,
            fields,
            thumbnail: target.displayAvatarURL({ dynamic: true }),
        })] });
    },
};
