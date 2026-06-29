// ─── CoinsBot — Commande: deposit ────────────────────────────────────────────
// Déposer de l'argent du portefeuille vers la banque.

const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount, progressBar } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'deposit',
    aliases: ['dep'],
    category: 'economy',
    description: 'Déposer de l\'argent dans votre banque.',
    usage: '&deposit <montant|all|half|50%>',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Montant requis`,
                    description: `Utilisation : \`${config.defaultPrefix}deposit <montant|all|half|50%>\``,
                })],
            });
        }

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            const wallet = Number(user.global_balance);
            const bank = Number(user.bank_balance);
            const bankLimit = Number(user.bank_limit);

            const parsed = parseAmount(args[0], wallet);
            if (parsed === null || parsed <= 0) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Montant invalide`,
                        description: 'Entrez un montant valide (nombre, `all`, `half`, ou `50%`).',
                    })],
                });
            }

            if (parsed > wallet) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Fonds insuffisants`,
                        description: `Vous n'avez que ${formatMoney(wallet)} dans votre portefeuille.`,
                    })],
                });
            }

            // Limit deposit to available bank space
            const space = bankLimit - bank;
            if (space <= 0) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.WARNING,
                        title: `${config.emojis.warning} Banque pleine`,
                        description: `Votre banque est pleine (${formatMoney(bank)} / ${formatMoney(bankLimit)}).`,
                    })],
                });
            }

            const amount = Math.min(parsed, space);

            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    {
                        global_balance: wallet - amount,
                        bank_balance: bank + amount,
                    },
                    { where: { id: message.author.id }, transaction: t }
                );

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount,
                    type: 'deposit',
                    description: `Dépôt bancaire`,
                    balance_after: wallet - amount,
                }, { transaction: t });
            });

            const newBank = bank + amount;
            const bankPercent = bankLimit > 0 ? Math.round((newBank / bankLimit) * 100) : 0;

            message.reply({
                embeds: [createEmbed({
                    color: COLORS.SUCCESS,
                    title: `${config.emojis.bank} Dépôt effectué`,
                    thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                    fields: [
                        { name: `${config.emojis.success} Déposé`, value: formatMoney(amount), inline: true },
                        { name: `${config.emojis.wallet} Portefeuille`, value: formatMoney(wallet - amount), inline: true },
                        { name: `${config.emojis.bank} Banque`, value: `${formatMoney(newBank)} / ${formatMoney(bankLimit)}`, inline: true },
                        { name: '📊 Capacité', value: `${progressBar(newBank, bankLimit, 12)} **${bankPercent}%**`, inline: false },
                    ],
                })],
            });
        });
    },
};
