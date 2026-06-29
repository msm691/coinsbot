// ─── CoinsBot — Commande: printer ────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const PRINTER_LEVELS = [
    { level: 0, cost: 0,      rate: 0,    name: 'Aucun' },
    { level: 1, cost: 5000,   rate: 10,   name: 'Basique' },
    { level: 2, cost: 15000,  rate: 25,   name: 'Avancé' },
    { level: 3, cost: 50000,  rate: 60,   name: 'Pro' },
    { level: 4, cost: 150000, rate: 150,  name: 'Industriel' },
    { level: 5, cost: 500000, rate: 400,  name: 'Quantique' },
];

module.exports = {
    name: 'printer',
    aliases: ['imprimante', 'print'],
    category: 'crypto',
    description: 'Imprimante à billets (revenu passif).',
    usage: '&printer [upgrade|collect]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
        const sub = (args[0] || 'info').toLowerCase();
        const currentLevel = user.printer_level || 0;
        const current = PRINTER_LEVELS[currentLevel] || PRINTER_LEVELS[0];

        if (sub === 'upgrade' || sub === 'améliorer') {
            const nextLevel = currentLevel + 1;
            if (nextLevel >= PRINTER_LEVELS.length) return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🖨️ Niveau maximum', description: 'Votre imprimante est au maximum !' })] });
            const next = PRINTER_LEVELS[nextLevel];

            await lockUser(message.author.id, async () => {
                const [freshUser] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                if (Number(freshUser.global_balance) < next.cost) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: ${formatMoney(next.cost)}` })] });

                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: Number(freshUser.global_balance) - next.cost, printer_level: nextLevel, printer_last_collect: new Date() }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: next.cost, type: 'shop_buy', description: `Imprimante niveau ${nextLevel}`, balance_after: Number(freshUser.global_balance) - next.cost }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: '🖨️ Imprimante améliorée !',
                    description: `Niveau **${nextLevel}** — *${next.name}*`,
                    fields: [{ name: '💰 Revenu/h', value: formatMoney(next.rate), inline: true }, { name: '💸 Coût', value: formatMoney(next.cost), inline: true }],
                })] });
            });
        } else if (sub === 'collect' || sub === 'collecter') {
            if (currentLevel === 0) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: '🖨️ Pas d\'imprimante', description: `Achetez-en une avec \`${config.defaultPrefix}printer upgrade\`.` })] });

            await lockUser(message.author.id, async () => {
                const [freshUser] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                const lastCollect = freshUser.printer_last_collect ? new Date(freshUser.printer_last_collect) : new Date();
                const hours = Math.min(24, (Date.now() - lastCollect.getTime()) / 3600000);
                if (hours < 0.5) return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🖨️ Pas encore', description: 'Attendez au moins 30 minutes.' })] });

                const revenue = Math.floor(current.rate * hours);

                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Number(freshUser.global_balance) + revenue;
                    await User.update({ global_balance: newBal, printer_last_collect: new Date() }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: revenue, type: 'enterprise', description: `Imprimante niv.${currentLevel}`, balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: '🖨️ Revenus collectés',
                    description: `${formatMoney(revenue)} imprimés en **${hours.toFixed(1)}h** !`,
                })] });
            });
        } else {
            // Info
            const nextLevel = Math.min(currentLevel + 1, PRINTER_LEVELS.length - 1);
            const next = PRINTER_LEVELS[nextLevel];
            message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '🖨️ Imprimante à billets',
                description: `Niveau actuel : **${currentLevel}** — *${current.name}*`,
                fields: [
                    { name: '💰 Revenu/h', value: formatMoney(current.rate), inline: true },
                    { name: '⬆️ Prochain niveau', value: currentLevel < PRINTER_LEVELS.length - 1 ? `Niv.${nextLevel} (${next.name}) — ${formatMoney(next.cost)}` : 'Maximum atteint', inline: true },
                    { name: '💡 Commandes', value: `\`collect\` | \`upgrade\``, inline: false },
                ],
            })] });
        }
    },
};
