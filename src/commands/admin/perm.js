// ─── CoinsBot — Commande: perm ────────────────────────────────────────────────
const { Guild } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { getCommand } = require('../../handlers/commandHandler');

module.exports = {
    name: 'perm',
    aliases: ['permissions', 'perms', 'permission'],
    category: 'admin',
    description: 'Gérer les permissions des commandes.',
    usage: '&perm <enable|disable|allow|deny|list> [commande] [@role]',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const sub = args[0]?.toLowerCase();
        const [guild] = await Guild.findOrCreate({ where: { id: message.guild.id }, defaults: {} });

        // ── list ────────────────────────────────────────────────────────────────
        if (sub === 'list') {
            const disabled = guild.disabled_commands || [];
            const perms = typeof guild.permissions === 'object' && guild.permissions !== null ? guild.permissions : {};
            const rolePerms = Object.entries(perms).filter(([k]) => !k.startsWith('_'));

            return message.reply({ embeds: [createEmbed({
                color: COLORS.ADMIN,
                title: '⚙️ Permissions du serveur',
                fields: [
                    {
                        name: '🚫 Commandes désactivées',
                        value: disabled.length ? disabled.map(c => `\`${c}\``).join(', ') : '*Aucune*',
                        inline: false,
                    },
                    {
                        name: '🔒 Accès par rôle',
                        value: rolePerms.length
                            ? rolePerms.map(([cmd, data]) => {
                                const allow = (data.allowed || []).map(r => `<@&${r}>`).join(' ');
                                const deny  = (data.denied  || []).map(r => `<@&${r}>`).join(' ');
                                return `\`${cmd}\` ✅${allow || '—'} 🚫${deny || '—'}`;
                            }).join('\n')
                            : '*Aucun*',
                        inline: false,
                    },
                ],
            })] });
        }

        // ── enable / disable ────────────────────────────────────────────────────
        if (sub === 'disable' || sub === 'enable') {
            const cmdName = args[1]?.toLowerCase();
            if (!cmdName) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Usage: \`&perm ${sub} <commande>\`` })] });
            }
            const command = getCommand(client, cmdName);
            if (!command) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Commande \`${cmdName}\` introuvable.` })] });
            }

            let disabled = Array.isArray(guild.disabled_commands) ? [...guild.disabled_commands] : [];
            if (sub === 'disable') {
                if (!disabled.includes(command.name)) disabled.push(command.name);
            } else {
                disabled = disabled.filter(c => c !== command.name);
            }
            await guild.update({ disabled_commands: disabled });
            return message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                description: `Commande \`${command.name}\` **${sub === 'disable' ? 'désactivée 🚫' : 'réactivée ✅'}** sur ce serveur.`,
            })] });
        }

        // ── allow / deny ────────────────────────────────────────────────────────
        if (sub === 'allow' || sub === 'deny') {
            const cmdName = args[1]?.toLowerCase();
            const role = message.mentions.roles.first();
            if (!cmdName || !role) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Usage: \`&perm ${sub} <commande> @role\`` })] });
            }
            const command = getCommand(client, cmdName);
            if (!command) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Commande \`${cmdName}\` introuvable.` })] });
            }

            const perms = typeof guild.permissions === 'object' && guild.permissions !== null ? { ...guild.permissions } : {};
            if (!perms[command.name]) perms[command.name] = { allowed: [], denied: [] };
            const entry = perms[command.name];

            if (sub === 'allow') {
                entry.allowed = [...new Set([...(entry.allowed || []), role.id])];
                entry.denied  = (entry.denied || []).filter(r => r !== role.id);
            } else {
                entry.denied  = [...new Set([...(entry.denied || []), role.id])];
                entry.allowed = (entry.allowed || []).filter(r => r !== role.id);
            }
            perms[command.name] = entry;
            await guild.update({ permissions: perms });

            return message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                description: `Rôle ${role} **${sub === 'allow' ? 'autorisé ✅' : 'refusé 🚫'}** pour \`${command.name}\`.`,
            })] });
        }

        // ── aide ────────────────────────────────────────────────────────────────
        message.reply({ embeds: [createEmbed({
            color: COLORS.ADMIN,
            title: '⚙️ Gestion des permissions',
            description: [
                '`&perm list` — Voir toutes les permissions',
                '`&perm disable <cmd>` — Désactiver une commande sur le serveur',
                '`&perm enable <cmd>` — Réactiver une commande',
                '`&perm allow <cmd> @role` — Autoriser un rôle à utiliser une commande',
                '`&perm deny <cmd> @role` — Interdire un rôle d\'utiliser une commande',
            ].join('\n'),
        })] });
    },
};
