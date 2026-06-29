// ─── CoinsBot — Commande: setprefix ──────────────────────────────────────────
const { Guild } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const config = require('../../config');

module.exports = {
    name: 'setprefix',
    aliases: ['prefix', 'changeprefix'],
    category: 'admin',
    description: 'Changer le préfixe du bot pour ce serveur.',
    usage: '&setprefix <nouveau_préfixe>',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const newPrefix = args[0];
        if (!newPrefix) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Usage: \`${config.defaultPrefix}setprefix <préfixe>\` (1-5 caractères)` })] });
        }
        if (newPrefix.length > 5) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Le préfixe ne peut pas dépasser **5 caractères**.' })] });
        }

        const [guild] = await Guild.findOrCreate({ where: { id: message.guild.id }, defaults: {} });
        await guild.update({ prefix: newPrefix });

        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS,
            title: '⚙️ Préfixe mis à jour',
            description: `Nouveau préfixe: \`${newPrefix}\`\nExemple: \`${newPrefix}help\``,
        })] });
    },
};
