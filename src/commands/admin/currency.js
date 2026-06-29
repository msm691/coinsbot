// ─── CoinsBot — Commande: currency ───────────────────────────────────────────
const { Guild } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');

module.exports = {
    name: 'currency',
    aliases: ['devise', 'monnaie'],
    category: 'admin',
    description: 'Configurer le nom et l\'emoji de la monnaie.',
    usage: '&currency <name <nom> | emoji <emoji> | reset>',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        const [guild] = await Guild.findOrCreate({ where: { id: message.guild.id }, defaults: {} });

        if (sub === 'reset') {
            await guild.update({ currency_name: 'coins', currency_emoji: '🪙' });
            return message.reply({ embeds: [createEmbed({ color: COLORS.SUCCESS, title: '⚙️ Monnaie réinitialisée', description: 'Retour à: **🪙 coins**' })] });
        }

        if (sub === 'name') {
            const name = args.slice(1).join(' ').trim();
            if (!name || name.length > 20) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Nom invalide (1-20 caractères).' })] });
            }
            await guild.update({ currency_name: name });
            return message.reply({ embeds: [createEmbed({ color: COLORS.SUCCESS, title: '⚙️ Nom de monnaie mis à jour', description: `Monnaie: **${guild.currency_emoji} ${name}**` })] });
        }

        if (sub === 'emoji') {
            const emoji = args[1];
            if (!emoji) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Fournis un emoji. Ex: `&currency emoji 💰`' })] });
            await guild.update({ currency_emoji: emoji });
            return message.reply({ embeds: [createEmbed({ color: COLORS.SUCCESS, title: '⚙️ Emoji de monnaie mis à jour', description: `Monnaie: **${emoji} ${guild.currency_name}**` })] });
        }

        // Affichage actuel
        message.reply({ embeds: [createEmbed({
            color: COLORS.ADMIN,
            title: '⚙️ Configuration de la monnaie',
            fields: [
                { name: 'Nom actuel', value: guild.currency_name, inline: true },
                { name: 'Emoji actuel', value: guild.currency_emoji, inline: true },
                { name: 'Sous-commandes', value: '`currency name <nom>`\n`currency emoji <emoji>`\n`currency reset`', inline: false },
            ],
        })] });
    },
};
