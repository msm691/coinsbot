// ─── CoinsBot — Commande: tycoon ──────────────────────────────────────────────
const { Enterprise } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const config = require('../../config');

const TYPE_EMOJI = { restaurant: '🍽️', tech: '💻', mine: '⛏️', farm: '🌾', factory: '🏭', casino: '🎰', bank: '🏦' };

module.exports = {
    name: 'tycoon',
    aliases: ['empire', 'holdings'],
    category: 'enterprise',
    description: 'Vue d\'ensemble de votre empire commercial.',
    usage: '&tycoon',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const enterprises = await Enterprise.findAll({
            where: { user_id: message.author.id, is_active: true },
            order: [['level', 'DESC']],
        });

        if (enterprises.length === 0) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO, title: '🏛️ Empire vide',
                description: `Créez votre première entreprise avec \`${config.defaultPrefix}entreprise créer <type>\``,
            })] });
        }

        let totalRevPerHour = 0;
        let totalEmployees = 0;
        let totalPending = 0;
        const fields = [];

        for (const ent of enterprises) {
            const emoji = TYPE_EMOJI[ent.type] || '🏢';
            const mods = Array.isArray(ent.modules) ? ent.modules : [];
            const durBar = '█'.repeat(Math.floor(ent.durability / 10)) + '░'.repeat(10 - Math.floor(ent.durability / 10));
            const hours = Math.min(24, (Date.now() - new Date(ent.last_collect).getTime()) / 3600000);
            const pending = Math.floor(Number(ent.revenue_per_hour) * hours * (ent.durability / 100));

            totalRevPerHour += Number(ent.revenue_per_hour);
            totalEmployees += ent.employees;
            totalPending += pending;

            fields.push({
                name: `${emoji} **${ent.name}** — Niv. ${ent.level} (ID: ${ent.id})`,
                value: [
                    `💰 **${formatMoney(Number(ent.revenue_per_hour))}/h** | 👥 ${ent.employees}/${ent.max_employees}`,
                    `🔧 ${durBar} ${ent.durability}% | 📦 ${mods.length > 0 ? mods.join(', ') : 'Aucun module'}`,
                    `⏳ En attente: **${formatMoney(pending)}**`,
                ].join('\n'),
                inline: false,
            });
        }

        message.reply({ embeds: [createEmbed({
            color: COLORS.ECONOMY,
            title: `🏛️ Empire de ${message.author.username}`,
            description: [
                `🏭 **${enterprises.length}** entreprise(s) actives`,
                `💰 Revenu total: **${formatMoney(totalRevPerHour)}/h**`,
                `👥 Employés: **${totalEmployees}**`,
                `💵 Revenus en attente: **~${formatMoney(totalPending)}**`,
                `\n> \`${config.defaultPrefix}entreprise collecter\` pour tout récupérer`,
            ].join('\n'),
            fields: fields.slice(0, 5),
            thumbnail: message.author.displayAvatarURL({ dynamic: true }),
        })] });
    },
};
