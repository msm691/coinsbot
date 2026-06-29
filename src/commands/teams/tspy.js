// ─── CoinsBot — Commande: tspy ────────────────────────────────────────────────
const { Team, TeamMember } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const config = require('../../config');

const SPY_COOLDOWN = 3600000; // 1h
const TROOP_POWER  = { tier1: 1, tier2: 5, tier3: 25 };

module.exports = {
    name: 'tspy',
    aliases: ['team-spy', 'espionner', 'spy'],
    category: 'teams',
    description: 'Espionner une alliance adverse.',
    usage: '&tspy <nom_alliance>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const targetName = args.join(' ');
        if (!targetName) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `\`${config.defaultPrefix}tspy <nom_alliance>\`` })] });

        const membership = await TeamMember.findOne({ where: { user_id: message.author.id } });
        if (!membership) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous n\'êtes dans aucune alliance.' })] });

        const myTeam = await Team.findOne({ where: { id: membership.team_id } });

        if (myTeam.last_spy) {
            const elapsed = Date.now() - new Date(myTeam.last_spy).getTime();
            if (elapsed < SPY_COOLDOWN) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '⏰ Espion en mission', description: `Prochain espionnage dans **${formatDuration(SPY_COOLDOWN - elapsed)}**.` })] });
            }
        }

        const target = await Team.findOne({ where: { name: targetName } });
        if (!target) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Alliance **${targetName}** introuvable.` })] });
        if (target.id === myTeam.id) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous ne pouvez pas vous espionner.' })] });

        // Mise à jour cooldown
        await Team.update({ last_spy: new Date() }, { where: { id: myTeam.id } });

        const troops     = target.troops || { tier1: 0, tier2: 0, tier3: 0 };
        const power      = Object.entries(troops).reduce((a, [k, v]) => a + v * TROOP_POWER[k], 0) + target.level * 10;
        const memberCount = await TeamMember.count({ where: { team_id: target.id } });

        // Trésorerie floue (plage au lieu de valeur exacte)
        const treasury = Number(target.treasury);
        const tresDesc = treasury < 5000       ? '💀 Quasi vide'
            : treasury < 50000     ? '😐 Modeste'
            : treasury < 250000    ? '💰 Confortable'
            : treasury < 1000000   ? '💎 Riche'
            : '👑 Très riche';

        // Bruit aléatoire sur les troupes (±10%)
        const noisedTroops = Object.fromEntries(
            Object.entries(troops).map(([k, v]) => [k, Math.max(0, v + Math.floor(v * (Math.random() * 0.2 - 0.1)))])
        );

        message.reply({ embeds: [createEmbed({
            color: COLORS.TEAM, title: `🕵️ Rapport d\'espionnage — [${target.tag}] ${target.name}`,
            description: `Votre agent infiltré rapporte des informations sur **${target.name}**.`,
            fields: [
                { name: '📊 Niveau',          value: `${target.level}`,                                      inline: true },
                { name: '👥 Membres',          value: `${memberCount}/${target.max_members}`,                 inline: true },
                { name: '🏆 Victoires/Défaites', value: `${target.wins}W / ${target.losses}L`,               inline: true },
                { name: '💰 Trésorerie (estimée)', value: tresDesc,                                          inline: true },
                { name: '💪 Puissance estimée',   value: `~${power} pts`,                                    inline: true },
                { name: '⚔️ Armée (approx.)',  value: `T1: ~${noisedTroops.tier1} | T2: ~${noisedTroops.tier2} | T3: ~${noisedTroops.tier3}`, inline: false },
            ],
            footer: '🕵️ Les informations sont approximatives — résultat de l\'espionnage.',
        })] });
    },
};
