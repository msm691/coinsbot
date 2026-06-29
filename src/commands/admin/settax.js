// ─── CoinsBot — Commande: settax ─────────────────────────────────────────────
const { Guild } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');

module.exports = {
    name: 'settax',
    aliases: ['taxe', 'tax', 'impot'],
    category: 'admin',
    description: 'Définir le taux de taxe sur les transferts (&pay).',
    usage: '&settax <0-50>',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const pct = parseFloat(args[0]);

        if (isNaN(pct) || pct < 0 || pct > 50) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Taux invalide. Entrez un pourcentage entre **0** et **50**.' })] });
        }

        const [guild] = await Guild.findOrCreate({ where: { id: message.guild.id }, defaults: {} });
        await guild.update({ tax_rate: pct / 100 });

        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS,
            title: '⚙️ Taxe mise à jour',
            fields: [
                { name: 'Taux actuel', value: `**${pct}%**`, inline: true },
                { name: 'Appliqué sur', value: '`&pay` (transferts)', inline: true },
                { name: 'Défaut', value: '5%', inline: true },
            ],
        })] });
    },
};
