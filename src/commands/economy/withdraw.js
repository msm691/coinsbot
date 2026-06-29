// ─── CoinsBot — Commande: withdraw ───────────────────────────────────────────
// Retirer de l'argent de la banque vers le portefeuille.

const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount, progressBar } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'withdraw',
    aliases: ['with', 'wh', 'retirer'],
    category: 'economy',
    description: 'Retirer de l\'argent de votre banque.',
    usage: '&withdraw <montant|all|half|50%>',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Montant requis`,
                    description: `Utilisation : \`${config.defaultPrefix}withdraw <montant|all|half|50%>\``,
                })],
            });
        }

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            const wallet = Number(user.global_balance);
            const bank = Number(user.bank_balance);
            const bankLimit = Number(user.bank_limit);

            // Parse amount relative to BANK balance
            const parsed = parseAmount(args[0], bank);
            if (parsed === null || parsed <= 0) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Montant invalide`,
                        description: 'Entrez un montant valide (nombre, `all`, `half`, ou `50%`).',
                    })],
                });
            }

            if (parsed > bank) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Fonds insuffisants`,
                        description: `Vous n'avez que ${formatMoney(bank)} dans votre banque.`,
                    })],
                });
            }

            const amount = parsed;

            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    {
                        global_balance: wallet + amount,
                        bank_balance: bank - amount,
                    },
                    { where: { id: message.author.id }, transaction: t }
                );

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount,
                    type: 'withdraw',
                    description: `Retrait bancaire`,
                    balance_after: wallet + amount,
                }, { transaction: t });
            });

            const newBank = bank - amount;
            const bankPercent = bankLimit > 0 ? Math.round((newBank / bankLimit) * 100) : 0;

            message.reply({
                embeds: [createEmbed({
                    color: COLORS.SUCCESS,
                    title: `${config.emojis.wallet} Retrait effectué`,
                    thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                    fields: [
                        { name: `${config.emojis.success} Retiré`, value: formatMoney(amount), inline: true },
                        { name: `${config.emojis.wallet} Portefeuille`, value: formatMoney(wallet + amount), inline: true },
                        { name: `${config.emojis.bank} Banque`, value: `${formatMoney(newBank)} / ${formatMoney(bankLimit)}`, inline: true },
                        { name: '📊 Capacité', value: `${progressBar(newBank, bankLimit, 12)} **${bankPercent}%**`, inline: false },
                    ],
                })],
            });
        });
    },
};
