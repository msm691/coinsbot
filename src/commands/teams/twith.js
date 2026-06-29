// ─── CoinsBot — Commande: twith ───────────────────────────────────────────────
const { User, Team, TeamMember, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'twith',
    aliases: ['team-withdraw', 'alliance-wh', 'twh'],
    category: 'teams',
    description: 'Retirer des fonds de la trésorerie de votre alliance.',
    usage: '&twith <montant|all|half>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const membership = await TeamMember.findOne({ where: { user_id: message.author.id } });
        if (!membership) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous n\'êtes dans aucune alliance.' })] });

        if (!['leader', 'co-leader'].includes(membership.rank)) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Seuls **leader** et **co-leader** peuvent retirer des fonds de la trésorerie.' })] });
        }

        const team = await Team.findOne({ where: { id: membership.team_id } });
        const amount = parseAmount(args[0], Number(team.treasury));

        if (!amount || amount <= 0) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Montant invalide`, description: `\`${config.defaultPrefix}twith <montant|all|half>\`\nTrésorerie: **${formatMoney(Number(team.treasury))}**` })] });
        }
        if (Number(team.treasury) < amount) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Trésorerie insuffisante`, description: `Disponible: **${formatMoney(Number(team.treasury))}**` })] });
        }

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            await atomicTransaction(sequelize, async (t) => {
                await Team.update({ treasury: Number(team.treasury) - amount }, { where: { id: team.id }, transaction: t });
                await User.update({ global_balance: Number(user.global_balance) + amount }, { where: { id: message.author.id }, transaction: t });
                await Transaction.create({ from_user_id: message.author.id, amount, type: 'withdraw', description: `Retrait trésorerie [${team.tag}]`, balance_after: Number(user.global_balance) + amount }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS, title: '🏦 Retrait effectué',
                description: `**${formatMoney(amount)}** retirés de **[${team.tag}] ${team.name}** !`,
                fields: [
                    { name: '💵 Montant reçu', value: formatMoney(amount), inline: true },
                    { name: '💰 Trésorerie restante', value: formatMoney(Number(team.treasury) - amount), inline: true },
                    { name: '👛 Votre solde', value: formatMoney(Number(user.global_balance) + amount), inline: true },
                ],
            })] });
        });
    },
};
