// ─── CoinsBot — Commande: tdep ────────────────────────────────────────────────
const { User, Team, TeamMember, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'tdep',
    aliases: ['team-deposit', 'alliance-dep', 'tdéposer'],
    category: 'teams',
    description: 'Déposer des fonds dans la trésorerie de votre alliance.',
    usage: '&tdep <montant|all|half>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const membership = await TeamMember.findOne({ where: { user_id: message.author.id } });
        if (!membership) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous n\'êtes dans aucune alliance.' })] });

        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
        const amount = parseAmount(args[0], Number(user.global_balance));

        if (!amount || amount <= 0) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Montant invalide`, description: `\`${config.defaultPrefix}tdep <montant|all|half>\`` })] });
        }
        if (Number(user.global_balance) < amount) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Solde: **${formatMoney(Number(user.global_balance))}**` })] });
        }

        await lockUser(message.author.id, async () => {
            const team = await Team.findOne({ where: { id: membership.team_id } });

            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: Number(user.global_balance) - amount }, { where: { id: message.author.id }, transaction: t });
                await Team.update({ treasury: Number(team.treasury) + amount }, { where: { id: team.id }, transaction: t });
                await TeamMember.update({ contributed: Number(membership.contributed) + amount }, { where: { id: membership.id }, transaction: t });
                await Transaction.create({ from_user_id: message.author.id, amount, type: 'pay', description: `Dépôt trésorerie [${team.tag}]`, balance_after: Number(user.global_balance) - amount }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS, title: '🏦 Dépôt effectué',
                description: `**${formatMoney(amount)}** versés dans la trésorerie de **[${team.tag}] ${team.name}** !`,
                fields: [
                    { name: '💰 Trésorerie', value: formatMoney(Number(team.treasury) + amount), inline: true },
                    { name: '📊 Votre contribution', value: formatMoney(Number(membership.contributed) + amount), inline: true },
                    { name: '👛 Votre solde', value: formatMoney(Number(user.global_balance) - amount), inline: true },
                ],
            })] });
        });
    },
};
