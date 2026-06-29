// ─── CoinsBot — Commande: entreprise ─────────────────────────────────────────
const { User, Enterprise, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const ENTERPRISE_TYPES = {
    restaurant: { emoji: '🍽️', cost: 20000,  baseRevenue: 100 },
    tech:       { emoji: '💻', cost: 50000,  baseRevenue: 250 },
    mine:       { emoji: '⛏️', cost: 30000,  baseRevenue: 150 },
    farm:       { emoji: '🌾', cost: 15000,  baseRevenue: 80 },
    factory:    { emoji: '🏭', cost: 40000,  baseRevenue: 200 },
    casino:     { emoji: '🎰', cost: 100000, baseRevenue: 500 },
    bank:       { emoji: '🏦', cost: 200000, baseRevenue: 800 },
};

module.exports = {
    name: 'entreprise',
    aliases: ['enterprise', 'ent', 'business'],
    category: 'enterprise',
    description: 'Gérer vos entreprises.',
    usage: '&entreprise [créer <type>|liste|collecter|info <id>]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const sub = (args[0] || 'liste').toLowerCase();

        if (sub === 'créer' || sub === 'creer' || sub === 'create') {
            const type = args[1]?.toLowerCase();
            if (!type || !ENTERPRISE_TYPES[type]) {
                const list = Object.entries(ENTERPRISE_TYPES).map(([k, v]) => `${v.emoji} **${k}** — ${formatMoney(v.cost)} | +${formatMoney(v.baseRevenue)}/h`).join('\n');
                return message.reply({ embeds: [createEmbed({ color: COLORS.INFO, title: '🏭 Types d\'entreprises', description: `${list}\n\n\`${config.defaultPrefix}entreprise créer <type>\`` })] });
            }
            const info = ENTERPRISE_TYPES[type];
            const name = args.slice(2).join(' ') || `${type.charAt(0).toUpperCase() + type.slice(1)} de ${message.author.username}`;

            await lockUser(message.author.id, async () => {
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                const balance = Number(user.global_balance);
                if (balance < info.cost) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Il faut ${formatMoney(info.cost)}.` })] });

                const count = await Enterprise.count({ where: { user_id: message.author.id } });
                if (count >= 5) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Limite atteinte`, description: 'Maximum 5 entreprises.' })] });

                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: balance - info.cost }, { where: { id: message.author.id }, transaction: t });
                    await Enterprise.create({ user_id: message.author.id, name, type, revenue_per_hour: info.baseRevenue }, { transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: info.cost, type: 'shop_buy', description: `Achat entreprise: ${name}`, balance_after: balance - info.cost }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: `${info.emoji} Entreprise créée !`,
                    description: `**${name}** (${type}) est opérationnelle !`,
                    fields: [
                        { name: '💰 Coût', value: formatMoney(info.cost), inline: true },
                        { name: '📈 Revenu/h', value: formatMoney(info.baseRevenue), inline: true },
                    ],
                })] });
            });
        } else if (sub === 'collecter' || sub === 'collect') {
            await lockUser(message.author.id, async () => {
                const enterprises = await Enterprise.findAll({ where: { user_id: message.author.id, is_active: true } });
                if (enterprises.length === 0) return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🏭 Aucune entreprise' })] });

                let totalRevenue = 0;
                await atomicTransaction(sequelize, async (t) => {
                    for (const ent of enterprises) {
                        const hours = Math.min(24, (Date.now() - new Date(ent.last_collect).getTime()) / 3600000);
                        if (hours < 0.5) continue;
                        const durabilityMult = ent.durability / 100;
                        const revenue = Math.floor(Number(ent.revenue_per_hour) * hours * ent.level * durabilityMult);
                        const newDurability = Math.max(0, ent.durability - Math.floor(hours * 2));
                        totalRevenue += revenue;
                        await Enterprise.update({ last_collect: new Date(), durability: newDurability }, { where: { id: ent.id }, transaction: t });
                    }
                    if (totalRevenue > 0) {
                        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {}, transaction: t });
                        const newBal = Number(user.global_balance) + totalRevenue;
                        await User.update({ global_balance: newBal }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: totalRevenue, type: 'enterprise', description: `Revenus de ${enterprises.length} entreprise(s)`, balance_after: newBal }, { transaction: t });
                    }
                });

                message.reply({ embeds: [createEmbed({
                    color: totalRevenue > 0 ? COLORS.SUCCESS : COLORS.WARNING,
                    title: '🏭 Revenus collectés',
                    description: totalRevenue > 0 ? `Vous recevez **${formatMoney(totalRevenue)}** de vos entreprises !` : 'Pas de revenus à collecter (attendez au moins 30 min).',
                })] });
            });
        } else if (sub === 'upgrade' || sub === 'améliorer') {
            const entId = parseInt(args[1]);
            if (!entId) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} ID requis`, description: `\`${config.defaultPrefix}entreprise upgrade <id>\`` })] });

            await lockUser(message.author.id, async () => {
                const ent = await Enterprise.findOne({ where: { id: entId, user_id: message.author.id } });
                if (!ent) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Introuvable` })] });

                const cost = ent.level * 10000;
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                if (Number(user.global_balance) < cost) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: ${formatMoney(cost)}` })] });

                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: Number(user.global_balance) - cost }, { where: { id: message.author.id }, transaction: t });
                    await Enterprise.update({ level: ent.level + 1, revenue_per_hour: Math.floor(Number(ent.revenue_per_hour) * 1.3) }, { where: { id: ent.id }, transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: '⬆️ Entreprise améliorée !',
                    description: `**${ent.name}** passe au niveau **${ent.level + 1}** !`,
                    fields: [{ name: '💰 Coût', value: formatMoney(cost), inline: true }, { name: '📈 Nouveau revenu/h', value: formatMoney(Math.floor(Number(ent.revenue_per_hour) * 1.3)), inline: true }],
                })] });
            });
        } else if (sub === 'repair' || sub === 'réparer' || sub === 'reparer') {
            const entId = parseInt(args[1]);
            if (!entId) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `\`${config.defaultPrefix}entreprise repair <id>\`` })] });

            await lockUser(message.author.id, async () => {
                const ent = await Enterprise.findOne({ where: { id: entId, user_id: message.author.id } });
                if (!ent) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Introuvable` })] });
                if (ent.durability >= 100) return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🔧 Pas besoin', description: 'L\'entreprise est en parfait état.' })] });

                const cost = Math.floor((100 - ent.durability) * 50);
                const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
                if (Number(user.global_balance) < cost) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: ${formatMoney(cost)}` })] });

                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: Number(user.global_balance) - cost }, { where: { id: message.author.id }, transaction: t });
                    await Enterprise.update({ durability: 100 }, { where: { id: ent.id }, transaction: t });
                });

                message.reply({ embeds: [createEmbed({ color: COLORS.SUCCESS, title: '🔧 Réparation effectuée', description: `**${ent.name}** est réparée ! (${ent.durability}% → 100%)`, fields: [{ name: '💰 Coût', value: formatMoney(cost), inline: true }] })] });
            });
        } else {
            // Liste des entreprises
            const enterprises = await Enterprise.findAll({ where: { user_id: message.author.id } });
            if (enterprises.length === 0) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.INFO, title: '🏭 Aucune entreprise', description: `Créez-en une avec \`${config.defaultPrefix}entreprise créer <type>\`` })] });
            }

            const list = enterprises.map(e => {
                const typeInfo = ENTERPRISE_TYPES[e.type] || { emoji: '🏢' };
                const durBar = '█'.repeat(Math.floor(e.durability / 10)) + '░'.repeat(10 - Math.floor(e.durability / 10));
                return `${typeInfo.emoji} **${e.name}** (ID: ${e.id})\nNiv. ${e.level} | ${formatMoney(Number(e.revenue_per_hour))}/h | 🔧 ${durBar} ${e.durability}%`;
            }).join('\n\n');

            message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '🏭 Vos entreprises',
                description: list,
                fields: [{ name: '💡 Actions', value: `\`collecter\` \`upgrade <id>\` \`repair <id>\` \`créer <type>\``, inline: false }],
            })] });
        }
    },
};
