// ─── CoinsBot — Commande: tarmy ───────────────────────────────────────────────
const { Team, TeamMember, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction } = require('../../utils/transactions');
const config = require('../../config');

const TROOPS = {
    tier1: { name: 'Miliciens', emoji: '⚔️',  cost: 100,  power: 1  },
    tier2: { name: 'Soldats',   emoji: '🗡️',  cost: 500,  power: 5  },
    tier3: { name: 'Élite',     emoji: '🛡️',  cost: 2000, power: 25 },
};

module.exports = {
    name: 'tarmy',
    aliases: ['team-army', 'armee', 'army', 'troupes'],
    category: 'teams',
    description: 'Recruter des troupes pour votre alliance (depuis la trésorerie).',
    usage: '&tarmy <tier1|tier2|tier3> <quantité>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const tier = args[0]?.toLowerCase();
        const qty  = parseInt(args[1]);

        if (!tier || !TROOPS[tier] || !qty || qty <= 0) {
            const fields = Object.entries(TROOPS).map(([key, t]) => ({
                name: `${t.emoji} \`${key}\` — ${t.name}`,
                value: `Coût: **${formatMoney(t.cost)}/troupe** | Puissance: **${t.power} pt(s)**`,
                inline: true,
            }));
            return message.reply({ embeds: [createEmbed({
                color: COLORS.TEAM, title: '⚔️ Recrutement de troupes',
                description: `\`${config.defaultPrefix}tarmy <tier1|tier2|tier3> <quantité>\`\nLes troupes sont payées depuis la trésorerie de l\'alliance.`,
                fields,
            })] });
        }

        const membership = await TeamMember.findOne({ where: { user_id: message.author.id } });
        if (!membership) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous n\'êtes dans aucune alliance.' })] });
        if (!['leader', 'co-leader', 'officer'].includes(membership.rank)) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Seuls **leader**, **co-leader** et **officer** peuvent recruter des troupes.' })] });
        }

        const team = await Team.findOne({ where: { id: membership.team_id } });
        const troop = TROOPS[tier];
        const cost = troop.cost * qty;

        if (Number(team.treasury) < cost) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Trésorerie insuffisante`, description: `Coût: **${formatMoney(cost)}** | Disponible: **${formatMoney(Number(team.treasury))}**` })] });
        }

        await atomicTransaction(sequelize, async (t) => {
            const troops = team.troops || { tier1: 0, tier2: 0, tier3: 0 };
            troops[tier] = (troops[tier] || 0) + qty;
            await Team.update({ treasury: Number(team.treasury) - cost, troops }, { where: { id: team.id }, transaction: t });
        });

        const updatedTroops = team.troops || { tier1: 0, tier2: 0, tier3: 0 };
        updatedTroops[tier] = (updatedTroops[tier] || 0) + qty;
        const totalPower = Object.entries(updatedTroops).reduce((acc, [k, v]) => acc + v * TROOPS[k].power, 0);

        message.reply({ embeds: [createEmbed({
            color: COLORS.TEAM, title: `${troop.emoji} Troupes recrutées !`,
            description: `**${qty}× ${troop.name}** rejoignent **[${team.tag}] ${team.name}** !`,
            fields: [
                { name: '💸 Coût (trésorerie)', value: formatMoney(cost), inline: true },
                { name: '💰 Trésorerie restante', value: formatMoney(Number(team.treasury) - cost), inline: true },
                { name: '💪 Puissance totale', value: `${totalPower} pts`, inline: true },
                { name: '⚔️ Composition armée', value: `T1: ${updatedTroops.tier1} | T2: ${updatedTroops.tier2} | T3: ${updatedTroops.tier3}`, inline: false },
            ],
        })] });
    },
};
