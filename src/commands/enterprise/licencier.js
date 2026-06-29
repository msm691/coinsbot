// ─── CoinsBot — Commande: licencier ───────────────────────────────────────────
const { Enterprise, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'licencier',
    aliases: ['fire', 'virer'],
    category: 'enterprise',
    description: 'Licencier un employé d\'une de vos entreprises.',
    usage: '&licencier <id_entreprise>',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const entId = parseInt(args[0]);
        if (!entId) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} ID requis`, description: `\`${config.defaultPrefix}licencier <id_entreprise>\`` })] });

        const ent = await Enterprise.findOne({ where: { id: entId, user_id: message.author.id, is_active: true } });
        if (!ent) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Introuvable` })] });
        if (ent.employees <= 0) return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '👥 Aucun employé', description: 'Pas d\'employé à licencier dans cette entreprise.' })] });

        const revenueReduction = Math.floor(Number(ent.revenue_per_hour) * 0.05);
        const newRevenue = Math.max(1, Number(ent.revenue_per_hour) - revenueReduction);

        await atomicTransaction(sequelize, async (t) => {
            await Enterprise.update({
                employees: ent.employees - 1,
                revenue_per_hour: newRevenue,
            }, { where: { id: ent.id }, transaction: t });
        });

        message.reply({ embeds: [createEmbed({
            color: COLORS.WARNING, title: '👥 Employé licencié',
            description: `**${ent.name}** : **${ent.employees - 1}/${ent.max_employees}** employés.`,
            fields: [
                { name: '📉 Perte revenu/h', value: `-${formatMoney(revenueReduction)}`, inline: true },
                { name: '💰 Revenu/h restant', value: formatMoney(newRevenue), inline: true },
            ],
        })] });
    },
};
