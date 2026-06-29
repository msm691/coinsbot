// ─── CoinsBot — Commande: profil ──────────────────────────────────────────────
const { User, UserCard, TeamMember, Team, Enterprise } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, progressBar } = require('../../utils/formatters');

const SKILL_EMOJI = { force:'💪', defense:'🛡️', chance:'🍀', intelligence:'🧠', endurance:'❤️', charisme:'✨' };

function xpRequired(level) { return level * 100; }

module.exports = {
    name: 'profil',
    aliases: ['profile', 'p', 'pp', 'perso'],
    category: 'rpg',
    description: 'Afficher votre profil RPG complet.',
    usage: '&profil [@utilisateur]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const [user] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });

        const cardCount = await UserCard.sum('quantity', { where: { user_id: target.id } }) || 0;
        const membership = await TeamMember.findOne({ where: { user_id: target.id } });
        const team = membership ? await Team.findOne({ where: { id: membership.team_id } }) : null;
        const enterpriseCount = await Enterprise.count({ where: { user_id: target.id, is_active: true } });

        const xpNeeded = xpRequired(user.level);
        const skills = user.skills || {};
        const skillStr = Object.entries(SKILL_EMOJI)
            .map(([k, e]) => `${e} **${skills[k] || 0}**`)
            .join(' · ');

        const rankEmoji = user.level >= 50 ? '👑' : user.level >= 30 ? '💎' : user.level >= 20 ? '🔥' : user.level >= 10 ? '⭐' : '🌱';

        let prisonValue = '✅ Libre';
        if (user.in_prison && user.prison_until) {
            const ts = Math.floor(new Date(user.prison_until).getTime() / 1000);
            prisonValue = `🔒 Libération <t:${ts}:R>`;
        }

        message.reply({ embeds: [createEmbed({
            color: COLORS.RPG,
            author: { name: `${target.username} — Profil RPG`, iconURL: target.displayAvatarURL({ dynamic: true }) },
            thumbnail: target.displayAvatarURL({ dynamic: true }),
            fields: [
                { name: `${rankEmoji} Niveau`,    value: `**${user.level}**`, inline: true },
                { name: '✨ XP',                   value: `${user.xp}/${xpNeeded}\n${progressBar(user.xp, xpNeeded)}`, inline: true },
                { name: '💼 Métier',               value: user.job || '*Aucun*', inline: true },
                { name: '👛 Portefeuille',          value: formatMoney(Number(user.global_balance)), inline: true },
                { name: '🏦 Banque',               value: formatMoney(Number(user.bank_balance)), inline: true },
                { name: '🏢 Entreprises',          value: `${enterpriseCount}`, inline: true },
                { name: '🃏 Cartes',               value: `${cardCount}`, inline: true },
                { name: '⚔️ Alliance',             value: team ? `[${team.tag}] ${team.name}` : '*Aucune*', inline: true },
                { name: '🔒 Statut',               value: prisonValue, inline: true },
                { name: '🎯 Compétences',           value: skillStr, inline: false },
            ],
        })] });
    },
};
