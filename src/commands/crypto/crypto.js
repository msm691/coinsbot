// ─── CoinsBot — Commande: crypto ─────────────────────────────────────────────
const { User, Crypto, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatNumber } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'crypto',
    aliases: ['bourse', 'marché', 'market', 'trading'],
    category: 'crypto',
    description: 'Consulter, acheter ou vendre des cryptomonnaies.',
    usage: '&crypto [buy|sell <symbole> <quantité>]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const sub = (args[0] || 'list').toLowerCase();

        if (sub === 'list' || sub === 'liste') {
            const cryptos = await Crypto.findAll({ where: { is_active: true } });
            const list = cryptos.map(c => {
                const change = c.current_price - c.previous_price;
                const pct = c.previous_price > 0 ? ((change / c.previous_price) * 100).toFixed(2) : '0.00';
                const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
                return `${arrow} **${c.symbol}** (${c.name}) — ${formatMoney(Math.floor(c.current_price))}\n   Δ ${change >= 0 ? '+' : ''}${pct}% | Vol: ${(c.volatility * 100).toFixed(0)}%`;
            }).join('\n\n');

            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '📈 Marché Crypto',
                description: `${list}\n\n💡 \`${config.defaultPrefix}crypto buy <SYM> <qté>\` | \`${config.defaultPrefix}crypto sell <SYM> <qté>\``,
            })] });
        }

        if (sub === 'buy' || sub === 'acheter') {
            const symbol = args[1]?.toUpperCase();
            const qty = parseInt(args[2]);
            if (!symbol || !qty || qty <= 0) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Utilisation`, description: `\`${config.defaultPrefix}crypto buy <symbole> <quantité>\`` })] });

            const crypto = await Crypto.findOne({ where: { symbol, is_active: true } });
            if (!crypto) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Crypto introuvable`, description: `Symbole \`${symbol}\` non trouvé.` })] });

            const totalCost = Math.floor(crypto.current_price * qty);

            await lockUser(message.author.id, async () => {
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                if (Number(user.global_balance) < totalCost) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: ${formatMoney(totalCost)}` })] });

                await atomicTransaction(sequelize, async (t) => {
                    const wallet = user.crypto_wallet || {};
                    wallet[symbol] = (wallet[symbol] || 0) + qty;
                    await User.update({ global_balance: Number(user.global_balance) - totalCost, crypto_wallet: wallet }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: totalCost, type: 'crypto_buy', description: `Achat ${qty} ${symbol}`, balance_after: Number(user.global_balance) - totalCost }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: `📈 Achat de ${symbol}`,
                    fields: [
                        { name: '📊 Quantité', value: `${qty} ${symbol}`, inline: true },
                        { name: '💰 Prix unitaire', value: formatMoney(Math.floor(crypto.current_price)), inline: true },
                        { name: '💸 Total', value: formatMoney(totalCost), inline: true },
                    ],
                })] });
            });
        } else if (sub === 'sell' || sub === 'vendre') {
            const symbol = args[1]?.toUpperCase();
            const qty = parseInt(args[2]);
            if (!symbol || !qty || qty <= 0) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Utilisation`, description: `\`${config.defaultPrefix}crypto sell <symbole> <quantité>\`` })] });

            const crypto = await Crypto.findOne({ where: { symbol, is_active: true } });
            if (!crypto) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Crypto introuvable` })] });

            await lockUser(message.author.id, async () => {
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                const wallet = user.crypto_wallet || {};
                if (!wallet[symbol] || wallet[symbol] < qty) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Quantité insuffisante`, description: `Vous avez ${wallet[symbol] || 0} ${symbol}.` })] });

                const totalValue = Math.floor(crypto.current_price * qty);

                await atomicTransaction(sequelize, async (t) => {
                    wallet[symbol] -= qty;
                    if (wallet[symbol] <= 0) delete wallet[symbol];
                    await User.update({ global_balance: Number(user.global_balance) + totalValue, crypto_wallet: wallet }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: totalValue, type: 'crypto_sell', description: `Vente ${qty} ${symbol}`, balance_after: Number(user.global_balance) + totalValue }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: `📉 Vente de ${symbol}`,
                    fields: [
                        { name: '📊 Quantité', value: `${qty} ${symbol}`, inline: true },
                        { name: '💰 Prix unitaire', value: formatMoney(Math.floor(crypto.current_price)), inline: true },
                        { name: '💵 Total reçu', value: formatMoney(totalValue), inline: true },
                    ],
                })] });
            });
        } else if (sub === 'wallet' || sub === 'portfolio' || sub === 'portefeuille') {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const wallet = user.crypto_wallet || {};
            const entries = Object.entries(wallet).filter(([, q]) => q > 0);
            if (entries.length === 0) return message.reply({ embeds: [createEmbed({ color: COLORS.INFO, title: '📊 Portefeuille Crypto', description: 'Aucune crypto détenue.' })] });

            let totalValue = 0;
            const lines = [];
            for (const [sym, qty] of entries) {
                const crypto = await Crypto.findOne({ where: { symbol: sym } });
                const price = crypto ? crypto.current_price : 0;
                const value = Math.floor(price * qty);
                totalValue += value;
                lines.push(`**${sym}** — ${qty} × ${formatMoney(Math.floor(price))} = **${formatMoney(value)}**`);
            }

            message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '📊 Portefeuille Crypto',
                description: lines.join('\n'),
                fields: [{ name: '💎 Valeur totale', value: `**${formatMoney(totalValue)}**`, inline: true }],
            })] });
        }
    },
};
