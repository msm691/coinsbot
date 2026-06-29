// ─── CoinsBot — Commande: buy ─────────────────────────────────────────────────
const { User, Market, Inventory, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { Op } = require('sequelize');
const config = require('../../config');

module.exports = {
    name: 'buy',
    aliases: ['acheter', 'achat', 'purchase'],
    category: 'rpg',
    description: 'Acheter un article de la boutique.',
    usage: '&buy <article> [quantité]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args.length) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `\`${config.defaultPrefix}buy <article> [quantité]\`` })] });

        // Dernier arg numérique = quantité
        const lastArg = args[args.length - 1];
        const qty = /^\d+$/.test(lastArg) && parseInt(lastArg) > 0 ? parseInt(lastArg) : 1;
        const itemName = qty > 1 ? args.slice(0, -1).join(' ') : args.join(' ');

        const item = await Market.findOne({ where: { item_name: { [Op.like]: itemName }, is_buyable: true } });
        if (!item) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Article **${itemName}** introuvable. Vérifiez \`${config.defaultPrefix}shop\`.` })] });

        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

        if (user.level < item.level_required) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Niveau **${item.level_required}** requis. Vous êtes niveau **${user.level}**.` })] });
        }

        const totalCost = Number(item.price) * qty;
        if (Number(user.global_balance) < totalCost) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: **${formatMoney(totalCost)}** | Disponible: **${formatMoney(Number(user.global_balance))}**` })] });
        }

        if (item.stock !== -1 && item.stock < qty) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Stock insuffisant. Disponible: **${item.stock}**` })] });
        }

        await lockUser(message.author.id, async () => {
            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    { global_balance: Number(user.global_balance) - totalCost },
                    { where: { id: message.author.id }, transaction: t },
                );

                const [inv, created] = await Inventory.findOrCreate({
                    where: { user_id: message.author.id, item_name: item.item_name },
                    defaults: { quantity: 0, metadata: { emoji: item.emoji, category: item.category, description: item.description, effects: item.effects } },
                    transaction: t,
                });
                await Inventory.update({ quantity: inv.quantity + qty }, { where: { id: inv.id }, transaction: t });

                if (item.stock !== -1) {
                    await Market.update({ stock: item.stock - qty }, { where: { id: item.id }, transaction: t });
                }

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount: totalCost,
                    type: 'shop_buy',
                    description: `Achat: ${item.item_name} ×${qty}`,
                    balance_after: Number(user.global_balance) - totalCost,
                }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                title: `${item.emoji} Achat confirmé !`,
                description: `**${qty}× ${item.item_name}** ajouté à votre inventaire.`,
                fields: [
                    { name: '💸 Payé',          value: formatMoney(totalCost), inline: true },
                    { name: '👛 Solde restant',  value: formatMoney(Number(user.global_balance) - totalCost), inline: true },
                    { name: '💡 Description',    value: item.description || '*Aucun*', inline: false },
                ],
            })] });
        });
    },
};
