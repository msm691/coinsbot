// ─── CoinsBot — Commande: remove ─────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');

module.exports = {
    name: 'remove',
    aliases: ['removecoins', 'take', 'retirer', 'removemoney'],
    category: 'admin',
    description: 'Retirer des coins du portefeuille d\'un utilisateur.',
    usage: '&remove @utilisateur <montant|all>',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Mentionne un utilisateur.' })] });
        if (target.bot) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Les bots ne peuvent pas perdre de coins.' })] });

        const [user] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });
        const balance = Number(user.global_balance);

        const amount = parseAmount(args[1], balance);
        if (!amount || amount <= 0) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Montant invalide. Entrez un entier positif ou `all`.' })] });
        }

        const actualRemoved = Math.min(amount, balance);
        const newBalance = balance - actualRemoved;

        await lockUser(target.id, async () => {
            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    { global_balance: newBalance },
                    { where: { id: target.id }, transaction: t },
                );
                await Transaction.create({
                    from_user_id: target.id,
                    to_user_id: message.author.id,
                    amount: actualRemoved,
                    type: 'system',
                    description: `Retrait admin par ${message.author.username}`,
                    balance_after: newBalance,
                }, { transaction: t });
            });
        });

        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS,
            title: '✅ Coins retirés',
            thumbnail: target.displayAvatarURL({ dynamic: true }),
            fields: [
                { name: 'Utilisateur', value: `${target}`, inline: true },
                { name: 'Montant retiré', value: formatMoney(actualRemoved), inline: true },
                { name: 'Nouveau solde', value: formatMoney(newBalance), inline: true },
            ],
        })] });
    },
};
