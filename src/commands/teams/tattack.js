// ─── CoinsBot — Commande: tattack ─────────────────────────────────────────────
const { Team, TeamMember, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction } = require('../../utils/transactions');
const config = require('../../config');

const ATTACK_COOLDOWN = 4 * 3600000; // 4h
const TROOP_POWER     = { tier1: 1, tier2: 5, tier3: 25 };
const CASUALTY_RATE   = 0.20;  // 20% pertes par combat
const LOOT_PERCENT    = 0.15;  // 15% de la trésorerie pillée

module.exports = {
    name: 'tattack',
    aliases: ['team-attack', 'attaquer', 'attack'],
    category: 'teams',
    description: 'Attaquer une autre alliance.',
    usage: '&tattack <nom_alliance>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const targetName = args.join(' ');
        if (!targetName) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `\`${config.defaultPrefix}tattack <nom_alliance>\`` })] });

        const membership = await TeamMember.findOne({ where: { user_id: message.author.id } });
        if (!membership) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous n\'êtes dans aucune alliance.' })] });
        if (!['leader', 'co-leader'].includes(membership.rank)) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Seuls **leader** et **co-leader** peuvent déclarer une attaque.' })] });
        }

        const attacker = await Team.findOne({ where: { id: membership.team_id } });

        if (attacker.last_attack) {
            const elapsed = Date.now() - new Date(attacker.last_attack).getTime();
            if (elapsed < ATTACK_COOLDOWN) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '⏰ Cooldown d\'attaque', description: `Prochain assaut dans **${formatDuration(ATTACK_COOLDOWN - elapsed)}**.` })] });
            }
        }

        const defender = await Team.findOne({ where: { name: targetName } });
        if (!defender) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Alliance **${targetName}** introuvable.` })] });
        if (defender.id === attacker.id) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous ne pouvez pas vous attaquer vous-même.' })] });

        const atkTroops = attacker.troops || { tier1: 0, tier2: 0, tier3: 0 };
        const defTroops = defender.troops || { tier1: 0, tier2: 0, tier3: 0 };

        const atkPower = Object.entries(atkTroops).reduce((a, [k, v]) => a + v * TROOP_POWER[k], 0) + attacker.level * 10;
        const defPower = Object.entries(defTroops).reduce((a, [k, v]) => a + v * TROOP_POWER[k], 0) + defender.level * 10;

        if (atkPower <= attacker.level * 10) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Votre armée est vide ! Recrutez des troupes avec \`${config.defaultPrefix}tarmy\`.` })] });
        }

        // Weighted RNG: higher power = better chance
        const atkWin = Math.random() * (atkPower + defPower) < atkPower;

        let loot = 0;
        const newAtkTroops = { ...atkTroops };
        const newDefTroops = { ...defTroops };
        const atkCas = { tier1: 0, tier2: 0, tier3: 0 };
        const defCas = { tier1: 0, tier2: 0, tier3: 0 };

        for (const tier of ['tier1', 'tier2', 'tier3']) {
            atkCas[tier] = Math.floor((newAtkTroops[tier] || 0) * CASUALTY_RATE);
            defCas[tier] = Math.floor((newDefTroops[tier] || 0) * CASUALTY_RATE);
            newAtkTroops[tier] = Math.max(0, (newAtkTroops[tier] || 0) - atkCas[tier]);
            newDefTroops[tier] = Math.max(0, (newDefTroops[tier] || 0) - defCas[tier]);
        }

        await atomicTransaction(sequelize, async (t) => {
            if (atkWin) {
                loot = Math.floor(Number(defender.treasury) * LOOT_PERCENT);
                await Team.update({ treasury: Number(attacker.treasury) + loot, troops: newAtkTroops, wins: attacker.wins + 1, last_attack: new Date() }, { where: { id: attacker.id }, transaction: t });
                await Team.update({ treasury: Math.max(0, Number(defender.treasury) - loot), troops: newDefTroops, losses: defender.losses + 1 }, { where: { id: defender.id }, transaction: t });
            } else {
                await Team.update({ troops: newAtkTroops, losses: attacker.losses + 1, last_attack: new Date() }, { where: { id: attacker.id }, transaction: t });
                await Team.update({ troops: newDefTroops, wins: defender.wins + 1 }, { where: { id: defender.id }, transaction: t });
            }
        });

        const totalAtkCas = Object.values(atkCas).reduce((a, b) => a + b, 0);
        const totalDefCas = Object.values(defCas).reduce((a, b) => a + b, 0);

        const resultColor  = atkWin ? COLORS.SUCCESS : COLORS.ERROR;
        const resultTitle  = atkWin
            ? `⚔️ Victoire ! [${attacker.tag}] écrase [${defender.tag}] !`
            : `💀 Défaite ! [${defender.tag}] repousse [${attacker.tag}] !`;

        message.reply({ embeds: [createEmbed({
            color: resultColor, title: resultTitle,
            description: [
                `**${attacker.name}** *(${atkPower} pts)* vs **${defender.name}** *(${defPower} pts)*`,
                atkWin ? `💰 Butin pillé: **${formatMoney(loot)}**` : 'Votre assaut a été repoussé.',
            ].join('\n'),
            fields: [
                { name: `💀 Pertes [${attacker.tag}]`, value: `${totalAtkCas} troupe(s)`, inline: true },
                { name: `💀 Pertes [${defender.tag}]`, value: `${totalDefCas} troupe(s)`, inline: true },
                { name: '⏰ Prochain assaut', value: formatDuration(ATTACK_COOLDOWN), inline: true },
            ],
        })] });
    },
};
