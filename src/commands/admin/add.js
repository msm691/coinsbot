// ─── CoinsBot — Commande: add ─────────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');

module.exports = {
    name: 'add',
    aliases: ['addcoins', 'addmoney', 'adminadd'],
    category: 'admin',
    description: 'Ajouter des coins au portefeuille d\'un utilisateur.',
    usage: '&add @utilisateur <montant>',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Mentionne un utilisateur.' })] });
        if (target.bot) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Les bots ne peuvent pas recevoir de coins.' })] });

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Montant invalide. Entrez un entier positif.' })] });
        }

        const [user] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });
        const newBalance = Number(user.global_balance) + amount;

        await lockUser(target.id, async () => {
            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    { global_balance: newBalance },
                    { where: { id: target.id }, transaction: t },
                );
                await Transaction.create({
                    from_user_id: message.author.id,
                    to_user_id: target.id,
                    amount,
                    type: 'system',
                    description: `Ajout admin par ${message.author.username}`,
                    balance_after: newBalance,
                }, { transaction: t });
            });
        });

        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS,
            title: '✅ Coins ajoutés',
            thumbnail: target.displayAvatarURL({ dynamic: true }),
            fields: [
                { name: 'Utilisateur', value: `${target}`, inline: true },
                { name: 'Montant ajouté', value: formatMoney(amount), inline: true },
                { name: 'Nouveau solde', value: formatMoney(newBalance), inline: true },
            ],
        })] });
    },
};
