// ─── CoinsBot — Commande: tycoon-market ───────────────────────────────────────
const { User, Enterprise, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const TYCOON_ITEMS = {
    repair_all:    { emoji: '🔧', desc: 'Répare toutes vos entreprises à 100% de durabilité.',    cost: 20000 },
    employee_pack: { emoji: '👥', desc: 'Ajoute 1 employé gratuit à chaque entreprise (si slot dispo).', cost: 25000 },
    turbo:         { emoji: '⚡', desc: 'Collecte immédiate de 2h de revenus sur toutes les entreprises.', cost: 35000 },
    insurance:     { emoji: '📋', desc: 'Remet toutes les entreprises inactives en activité.',    cost: 15000 },
};

module.exports = {
    name: 'tycoon-market',
    aliases: ['tmarket', 'entmarket', 'marche-ent'],
    category: 'enterprise',
    description: 'Marché spécial pour les entrepreneurs.',
    usage: '&tycoon-market [buy <article>]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const sub = (args[0] || 'list').toLowerCase();

        if (sub === 'list' || sub === 'liste' || sub === 'shop') {
            const fields = Object.entries(TYCOON_ITEMS).map(([key, item]) => ({
                name: `${item.emoji} \`${key}\` — ${formatMoney(item.cost)}`,
                value: item.desc,
                inline: false,
            }));
            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '🏪 Marché Tycoon',
                description: `Achetez avec \`${config.defaultPrefix}tycoon-market buy <article>\``,
                fields,
            })] });
        }

        if (sub === 'buy' || sub === 'acheter') {
            const key = args[1]?.toLowerCase();
            if (!key || !TYCOON_ITEMS[key]) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Article inconnu`, description: `Disponibles: **${Object.keys(TYCOON_ITEMS).join(', ')}**` })] });
            }

            const item = TYCOON_ITEMS[key];

            await lockUser(message.author.id, async () => {
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                if (Number(user.global_balance) < item.cost) {
                    return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: **${formatMoney(item.cost)}**` })] });
                }

                let resultDesc = item.desc;

                await atomicTransaction(sequelize, async (t) => {
                    const enterprises = await Enterprise.findAll({ where: { user_id: message.author.id }, transaction: t });

                    await User.update({ global_balance: Number(user.global_balance) - item.cost }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({
                        from_user_id: message.author.id, amount: item.cost, type: 'shop_buy',
                        description: `Tycoon Market: ${key}`, balance_after: Number(user.global_balance) - item.cost,
                    }, { transaction: t });

                    if (key === 'repair_all') {
                        for (const ent of enterprises) await Enterprise.update({ durability: 100 }, { where: { id: ent.id }, transaction: t });
                        resultDesc = `${enterprises.length} entreprise(s) réparée(s) à 100% !`;

                    } else if (key === 'employee_pack') {
                        let hired = 0;
                        for (const ent of enterprises) {
                            if (ent.employees < ent.max_employees) {
                                const bonus = Math.floor(Number(ent.revenue_per_hour) * 0.05);
                                await Enterprise.update({ employees: ent.employees + 1, revenue_per_hour: Number(ent.revenue_per_hour) + bonus }, { where: { id: ent.id }, transaction: t });
                                hired++;
                            }
                        }
                        resultDesc = `${hired} employé(s) ajouté(s) !`;

                    } else if (key === 'turbo') {
                        let totalBonus = 0;
                        for (const ent of enterprises.filter(e => e.is_active)) {
                            const bonus = Math.floor(Number(ent.revenue_per_hour) * 2 * (ent.durability / 100));
                            totalBonus += bonus;
                        }
                        const newBal = Number(user.global_balance) - item.cost + totalBonus;
                        await User.update({ global_balance: newBal }, { where: { id: message.author.id }, transaction: t });
                        resultDesc = `**${formatMoney(totalBonus)}** collectés (2h de revenus) !`;

                    } else if (key === 'insurance') {
                        const inactive = enterprises.filter(e => !e.is_active);
                        for (const ent of inactive) await Enterprise.update({ is_active: true, durability: 50 }, { where: { id: ent.id }, transaction: t });
                        resultDesc = `${inactive.length} entreprise(s) réactivée(s) !`;
                    }
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: `${item.emoji} ${key} acheté !`,
                    description: resultDesc,
                    fields: [{ name: '💸 Coût', value: formatMoney(item.cost), inline: true }],
                })] });
            });
        }
    },
};
