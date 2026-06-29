// ─── CoinsBot — Commande: xp ──────────────────────────────────────────────────
const { User } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { progressBar } = require('../../utils/formatters');

function xpRequired(level) { return level * 100; }

module.exports = {
    name: 'xp',
    aliases: ['niveau', 'level', 'rang', 'exp'],
    category: 'rpg',
    description: 'Afficher votre progression XP et niveau.',
    usage: '&xp [@utilisateur]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const [user] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });

        const xpNeeded = xpRequired(user.level);
        const pct = Math.min(100, Math.floor((user.xp / xpNeeded) * 100));

        const rankEmoji = user.level >= 50 ? '👑' : user.level >= 30 ? '💎' : user.level >= 20 ? '🔥' : user.level >= 10 ? '⭐' : '🌱';

        message.reply({ embeds: [createEmbed({
            color: COLORS.RPG,
            title: `${rankEmoji} Progression — ${target.username}`,
            description: `**Niveau ${user.level}**\n${progressBar(user.xp, xpNeeded, 12)} **${pct}%**`,
            fields: [
                { name: '✨ XP actuel',     value: user.xp.toLocaleString('fr-FR'), inline: true },
                { name: '🎯 XP requis',     value: xpNeeded.toLocaleString('fr-FR'), inline: true },
                { name: '📈 XP restant',    value: Math.max(0, xpNeeded - user.xp).toLocaleString('fr-FR'), inline: true },
                { name: '🏆 Niveau suivant', value: `Niveau **${user.level + 1}** → ${xpRequired(user.level + 1)} XP requis`, inline: false },
            ],
            footer: 'Gagnez de l\'XP en travaillant, commettant des crimes et jouant au casino.',
        })] });
    },
};
