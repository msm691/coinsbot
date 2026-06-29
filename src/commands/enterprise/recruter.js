// ─── CoinsBot — Commande: recruter ────────────────────────────────────────────
const { User, Enterprise, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'recruter',
    aliases: ['hire', 'embaucher'],
    category: 'enterprise',
    description: 'Recruter un employé pour une de vos entreprises.',
    usage: '&recruter <id_entreprise>',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const entId = parseInt(args[0]);
        if (!entId) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} ID requis`, description: `\`${config.defaultPrefix}recruter <id_entreprise>\`` })] });

        await lockUser(message.author.id, async () => {
            const ent = await Enterprise.findOne({ where: { id: entId, user_id: message.author.id, is_active: true } });
            if (!ent) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Introuvable`, description: 'Entreprise non trouvée ou inactive.' })] });

            if (ent.employees >= ent.max_employees) {
                return message.reply({ embeds: [createEmbed({
                    color: COLORS.WARNING, title: '👥 Effectif maximum',
                    description: `Limite de **${ent.max_employees}** employés atteinte.\nAchetez le module \`expansion\` avec \`${config.defaultPrefix}modules buy ${ent.id} expansion\`.`,
                })] });
            }

            const hireCost = (ent.employees + 1) * 500 * ent.level;
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            if (Number(user.global_balance) < hireCost) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: **${formatMoney(hireCost)}**` })] });
            }

            const revenueBonus = Math.floor(Number(ent.revenue_per_hour) * 0.05);

            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: Number(user.global_balance) - hireCost }, { where: { id: message.author.id }, transaction: t });
                await Enterprise.update({
                    employees: ent.employees + 1,
                    revenue_per_hour: Number(ent.revenue_per_hour) + revenueBonus,
                }, { where: { id: ent.id }, transaction: t });
                await Transaction.create({
                    from_user_id: message.author.id, amount: hireCost, type: 'shop_buy',
                    description: `Recrutement: ${ent.name}`, balance_after: Number(user.global_balance) - hireCost,
                }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS, title: '👥 Employé recruté !',
                description: `**${ent.name}** : **${ent.employees + 1}/${ent.max_employees}** employés.`,
                fields: [
                    { name: '💸 Coût d\'embauche', value: formatMoney(hireCost), inline: true },
                    { name: '📈 Bonus revenu/h', value: `+${formatMoney(revenueBonus)}`, inline: true },
                    { name: '💰 Nouveau revenu/h', value: formatMoney(Number(ent.revenue_per_hour) + revenueBonus), inline: true },
                ],
            })] });
        });
    },
};
