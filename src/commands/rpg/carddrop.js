// ─── CoinsBot — Commande: carddrop ───────────────────────────────────────────
const { User, Card, UserCard, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const DROP_COST = 500;
const RARITY_COLOR  = { common: COLORS.INFO, uncommon: 0x2ecc71, rare: 0x3498db, epic: 0x9b59b6, legendary: 0xf1c40f, mythic: 0xe74c3c };
const RARITY_FRENCH = { common:'Commun', uncommon:'Peu commun', rare:'Rare', epic:'Épique', legendary:'Légendaire', mythic:'Mythique' };
const RARITY_EMOJI  = { common:'⚪', uncommon:'🟢', rare:'🔵', epic:'🟣', legendary:'🟡', mythic:'🔴' };

module.exports = {
    name: 'carddrop',
    aliases: ['drop', 'carte', 'gacha', 'pull'],
    category: 'rpg',
    description: `Obtenir une carte aléatoire (coût: ${formatMoney(DROP_COST)}).`,
    usage: '&carddrop',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

        if (Number(user.global_balance) < DROP_COST) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.ERROR,
                description: `Il faut **${formatMoney(DROP_COST)}** pour un drop. Solde: **${formatMoney(Number(user.global_balance))}**`,
            })] });
        }

        const cards = await Card.findAll();
        if (!cards.length) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Aucune carte disponible dans le pool.' })] });
        }

        // Sélection pondérée par drop_rate
        const totalWeight = cards.reduce((a, c) => a + c.drop_rate, 0);
        let rand = Math.random() * totalWeight;
        let chosen = cards[cards.length - 1];
        for (const card of cards) {
            rand -= card.drop_rate;
            if (rand <= 0) { chosen = card; break; }
        }

        await lockUser(message.author.id, async () => {
            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    { global_balance: Number(user.global_balance) - DROP_COST },
                    { where: { id: message.author.id }, transaction: t },
                );

                const [uc, created] = await UserCard.findOrCreate({
                    where: { user_id: message.author.id, card_id: chosen.id },
                    defaults: { quantity: 1 },
                    transaction: t,
                });
                if (!created) await UserCard.update({ quantity: uc.quantity + 1 }, { where: { id: uc.id }, transaction: t });

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount: DROP_COST,
                    type: 'shop_buy',
                    description: `Carddrop: ${chosen.name}`,
                    balance_after: Number(user.global_balance) - DROP_COST,
                }, { transaction: t });
            });

            const rarityStr = `${RARITY_EMOJI[chosen.rarity]} ${RARITY_FRENCH[chosen.rarity]}`;

            message.reply({ embeds: [createEmbed({
                color: RARITY_COLOR[chosen.rarity] || COLORS.INFO,
                title: '🎴 Nouvelle carte obtenue !',
                description: `**${chosen.name}**\n${rarityStr}\n\n*${chosen.description || 'Une carte de collection.'}*`,
                fields: [
                    { name: '⚔️ Attaque',  value: `${chosen.attack}`,  inline: true },
                    { name: '🛡️ Défense', value: `${chosen.defense}`, inline: true },
                    { name: '💨 Vitesse',  value: `${chosen.speed}`,   inline: true },
                    { name: '📚 Série',    value: chosen.series,        inline: true },
                    { name: '💸 Coût',     value: formatMoney(DROP_COST), inline: true },
                    { name: '👛 Solde',    value: formatMoney(Number(user.global_balance) - DROP_COST), inline: true },
                ],
                image: chosen.image_url || null,
            })] });
        });
    },
};
