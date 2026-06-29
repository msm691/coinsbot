// ─── CoinsBot — Log Handler ───────────────────────────────────────────────────
// Posts structured log embeds to the guild's log_channel_id.

const { createEmbed, COLORS } = require('./embed');

const LOG_TYPES = {
    COMMAND:     { emoji: '🔧', color: COLORS.INFO,    label: 'Commande exécutée' },
    ECONOMY:     { emoji: '🪙', color: COLORS.ECONOMY, label: 'Transaction' },
    ADMIN:       { emoji: '⚙️', color: COLORS.ADMIN,   label: 'Action admin' },
    MODERATION:  { emoji: '🔨', color: COLORS.WARNING,  label: 'Modération' },
    ERROR:       { emoji: '❌', color: COLORS.ERROR,    label: 'Erreur' },
    JOIN:        { emoji: '📥', color: COLORS.SUCCESS,  label: 'Membre rejoint' },
    LEAVE:       { emoji: '📤', color: COLORS.WARNING,  label: 'Membre parti' },
    CASINO:      { emoji: '🎲', color: COLORS.CASINO,   label: 'Casino' },
    CRIME:       { emoji: '🚨', color: COLORS.ERROR,    label: 'Crime' },
};

/**
 * Post a log embed to the guild's log_channel_id.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild}  discordGuild
 * @param {string}  type    — Key from LOG_TYPES
 * @param {Object}  options
 * @param {string}  [options.title]
 * @param {string}  [options.description]
 * @param {Array}   [options.fields]
 * @param {import('discord.js').User} [options.user]  — Actor (author line)
 * @param {import('discord.js').User} [options.target] — Target (thumbnail)
 */
async function sendLog(client, discordGuild, type, { title, description, fields = [], user, target } = {}) {
    try {
        const { Guild } = require('../database/models');
        const guildData = await Guild.findOne({ where: { id: discordGuild.id } });
        if (!guildData?.log_channel_id) return;

        const channel = await client.channels.fetch(guildData.log_channel_id).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const meta = LOG_TYPES[type] || LOG_TYPES.COMMAND;

        const embed = createEmbed({
            color: meta.color,
            title: title || `${meta.emoji} ${meta.label}`,
            description,
            fields,
            footer: `CoinsBot Logs • ${meta.label}`,
            thumbnail: target ? target.displayAvatarURL({ dynamic: true }) : undefined,
            author: user
                ? { name: `${user.username} (${user.id})`, iconURL: user.displayAvatarURL({ dynamic: true }) }
                : undefined,
        });

        await channel.send({ embeds: [embed] });
    } catch {
        // Silently fail — log errors must never crash commands
    }
}

/**
 * Shorthand helpers
 */
const log = {
    command:    (client, guild, opts) => sendLog(client, guild, 'COMMAND',    opts),
    economy:    (client, guild, opts) => sendLog(client, guild, 'ECONOMY',    opts),
    admin:      (client, guild, opts) => sendLog(client, guild, 'ADMIN',      opts),
    moderation: (client, guild, opts) => sendLog(client, guild, 'MODERATION', opts),
    error:      (client, guild, opts) => sendLog(client, guild, 'ERROR',      opts),
    join:       (client, guild, opts) => sendLog(client, guild, 'JOIN',       opts),
    leave:      (client, guild, opts) => sendLog(client, guild, 'LEAVE',      opts),
    casino:     (client, guild, opts) => sendLog(client, guild, 'CASINO',     opts),
    crime:      (client, guild, opts) => sendLog(client, guild, 'CRIME',      opts),
};

module.exports = { sendLog, log, LOG_TYPES };
