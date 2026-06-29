// ─── CoinsBot — Commande: settime ────────────────────────────────────────────
const { Guild } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { getCommand } = require('../../handlers/commandHandler');
const config = require('../../config');

module.exports = {
    name: 'settime',
    aliases: ['cooldown', 'setcooldown', 'cdset'],
    category: 'admin',
    description: 'Définir le cooldown d\'une commande pour ce serveur.',
    usage: '&settime <commande> <secondes>',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const cmdName = args[0]?.toLowerCase();
        const seconds = parseInt(args[1]);

        if (!cmdName || isNaN(seconds) || seconds < 0) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Usage: `&settime <commande> <secondes>` (0 = désactiver le cooldown)' })] });
        }

        const command = getCommand(client, cmdName);
        if (!command) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Commande \`${cmdName}\` introuvable.` })] });
        }

        const [guild] = await Guild.findOrCreate({ where: { id: message.guild.id }, defaults: {} });
        const perms = typeof guild.permissions === 'object' && guild.permissions !== null ? { ...guild.permissions } : {};
        if (!perms._cooldowns) perms._cooldowns = {};
        perms._cooldowns[command.name] = seconds * 1000;
        await guild.update({ permissions: perms });

        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS,
            title: '⚙️ Cooldown mis à jour',
            fields: [
                { name: 'Commande', value: `\`${command.name}\``, inline: true },
                { name: 'Cooldown', value: seconds === 0 ? 'Désactivé' : `**${seconds}s**`, inline: true },
                { name: 'Défaut', value: `${(command.cooldown || 3000) / 1000}s`, inline: true },
            ],
        })] });
    },
};
