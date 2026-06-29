// ─── CoinsBot — Commande: setchannel ─────────────────────────────────────────
const { Guild } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');

const CHANNEL_MAP = {
    log:     'log_channel_id',
    welcome: 'welcome_channel_id',
    shop:    'shop_channel_id',
};
const CHANNEL_LABELS = { log: '📋 Logs', welcome: '👋 Bienvenue', shop: '🛒 Boutique' };

module.exports = {
    name: 'setchannel',
    aliases: ['salon', 'channel', 'setsalon'],
    category: 'admin',
    description: 'Configurer les salons dédiés du bot.',
    usage: '&setchannel <log|welcome|shop> [#salon | reset]',
    cooldown: 3000,
    permissions: 'admin',

    async execute(message, args, client) {
        const [guild] = await Guild.findOrCreate({ where: { id: message.guild.id }, defaults: {} });
        const type = args[0]?.toLowerCase();

        if (!type || !CHANNEL_MAP[type]) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.ADMIN,
                title: '⚙️ Salons configurés',
                fields: Object.entries(CHANNEL_LABELS).map(([k, label]) => ({
                    name: label,
                    value: guild[CHANNEL_MAP[k]] ? `<#${guild[CHANNEL_MAP[k]]}>` : '*Non défini*',
                    inline: true,
                })),
                footer: 'Usage: &setchannel <log|welcome|shop> [#salon | reset]',
            })] });
        }

        if (args[1]?.toLowerCase() === 'reset') {
            await guild.update({ [CHANNEL_MAP[type]]: null });
            return message.reply({ embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${CHANNEL_LABELS[type]} réinitialisé.` })] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Mentionne un salon textuel ou utilise `reset`.' })] });
        }

        await guild.update({ [CHANNEL_MAP[type]]: channel.id });
        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS,
            title: '⚙️ Salon mis à jour',
            description: `${CHANNEL_LABELS[type]} → ${channel}`,
        })] });
    },
};
