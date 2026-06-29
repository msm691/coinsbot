// ─── CoinsBot — Commande: modules ─────────────────────────────────────────────
const { User, Enterprise, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const MODULES = {
    automation: { emoji: '🤖', desc: '+20% revenus/h',                costBase: 10000, revenueBonus: 0.20, empBonus: 0 },
    marketing:  { emoji: '📣', desc: '+15% revenus/h',                costBase: 8000,  revenueBonus: 0.15, empBonus: 0 },
    security:   { emoji: '🛡️', desc: 'Réduit l\'usure de 50%',       costBase: 6000,  revenueBonus: 0,    empBonus: 0 },
    accounting: { emoji: '📊', desc: '+10% revenus/h',                costBase: 5000,  revenueBonus: 0.10, empBonus: 0 },
    expansion:  { emoji: '🏗️', desc: '+3 slots d\'employés',          costBase: 12000, revenueBonus: 0,    empBonus: 3 },
};

module.exports = {
    name: 'modules',
    aliases: ['module', 'mod'],
    category: 'enterprise',
    description: 'Acheter des modules pour booster vos entreprises.',
    usage: '&modules [list|buy <id_ent> <module>]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const sub = (args[0] || 'list').toLowerCase();

        if (sub === 'list' || sub === 'liste') {
            const fields = Object.entries(MODULES).map(([key, m]) => ({
                name: `${m.emoji} \`${key}\` — ${formatMoney(m.costBase)} (× niv. ent.)`,
                value: m.desc,
                inline: true,
            }));

            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '🔧 Modules d\'entreprise',
                description: `Le coût est multiplié par le niveau de l\'entreprise.\n\`${config.defaultPrefix}modules buy <id_ent> <module>\``,
                fields,
            })] });
        }

        if (sub === 'buy' || sub === 'acheter') {
            const entId = parseInt(args[1]);
            const modKey = args[2]?.toLowerCase();

            if (!entId || !modKey) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `\`${config.defaultPrefix}modules buy <id_ent> <module>\`` })] });
            if (!MODULES[modKey]) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Module inconnu`, description: `Disponibles: **${Object.keys(MODULES).join(', ')}**` })] });

            await lockUser(message.author.id, async () => {
                const ent = await Enterprise.findOne({ where: { id: entId, user_id: message.author.id, is_active: true } });
                if (!ent) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Introuvable` })] });

                const existing = Array.isArray(ent.modules) ? ent.modules : [];
                if (existing.includes(modKey)) {
                    return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🔧 Déjà installé', description: `Le module **${modKey}** est déjà actif sur **${ent.name}**.` })] });
                }

                const mod = MODULES[modKey];
                const cost = mod.costBase * ent.level;
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                if (Number(user.global_balance) < cost) {
                    return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: **${formatMoney(cost)}**` })] });
                }

                const newModules = [...existing, modKey];
                let newRevenue = Number(ent.revenue_per_hour);
                if (mod.revenueBonus > 0) newRevenue = Math.floor(newRevenue * (1 + mod.revenueBonus));
                const newMaxEmp = ent.max_employees + mod.empBonus;

                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: Number(user.global_balance) - cost }, { where: { id: message.author.id }, transaction: t });
                    await Enterprise.update({ modules: newModules, revenue_per_hour: newRevenue, max_employees: newMaxEmp }, { where: { id: ent.id }, transaction: t });
                    await Transaction.create({
                        from_user_id: message.author.id, amount: cost, type: 'shop_buy',
                        description: `Module ${modKey} → ${ent.name}`, balance_after: Number(user.global_balance) - cost,
                    }, { transaction: t });
                });

                const resultFields = [{ name: '💸 Coût', value: formatMoney(cost), inline: true }];
                if (mod.revenueBonus > 0) resultFields.push({ name: '📈 Nouveau revenu/h', value: formatMoney(newRevenue), inline: true });
                if (mod.empBonus > 0) resultFields.push({ name: '👥 Nouveaux slots', value: `+${mod.empBonus} (max ${newMaxEmp})`, inline: true });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: `${mod.emoji} Module installé: ${modKey}`,
                    description: `**${mod.desc}** activé sur **${ent.name}** !`,
                    fields: resultFields,
                })] });
            });
        }
    },
};
