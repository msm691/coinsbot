// ──────────────────────────────────────────────
//  CoinsBot — Premium Embed Builder Utility
//  Provides rich, themed embeds for all bot responses
// ──────────────────────────────────────────────

const { EmbedBuilder } = require('discord.js');

/**
 * Color palette for all bot embeds.
 * Each color is tied to a specific feature domain.
 */
const COLORS = {
    SUCCESS:  0x2ecc71, // Emerald green
    ERROR:    0xe74c3c, // Red
    WARNING:  0xf39c12, // Orange
    INFO:     0x3498db, // Blue
    ECONOMY:  0xf1c40f, // Gold
    CASINO:   0x9b59b6, // Purple
    RPG:      0x1abc9c, // Dark teal
    ADMIN:    0xc0392b, // Dark red
    TEAM:     0x2c3e50, // Navy
    CRYPTO:   0x00d2d3, // Cyan
};

/** Default footer text shown on every embed */
const DEFAULT_FOOTER = 'CoinsBot • Économie & RPG';

/**
 * Creates a rich Discord embed with sensible defaults.
 * All parameters are optional — bare call returns a branded embed.
 *
 * @param {Object} options
 * @param {string}  [options.title]       — Embed title
 * @param {string}  [options.description] — Embed body text
 * @param {number}  [options.color]       — Hex color (use COLORS constant)
 * @param {Array}   [options.fields]      — Array of { name, value, inline }
 * @param {string}  [options.footer]      — Custom footer text (overrides default)
 * @param {string}  [options.thumbnail]   — Thumbnail image URL
 * @param {string}  [options.image]       — Large image URL
 * @param {Object}  [options.author]      — { name, iconURL, url }
 * @param {boolean} [options.timestamp]   — Whether to add current timestamp (default: true)
 * @returns {EmbedBuilder}
 */
function createEmbed({
    title,
    description,
    color = COLORS.INFO,
    fields = [],
    footer,
    thumbnail,
    image,
    author,
    timestamp = true,
} = {}) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: footer || DEFAULT_FOOTER });

    if (title)       embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (thumbnail)   embed.setThumbnail(thumbnail);
    if (image)       embed.setImage(image);
    if (timestamp)   embed.setTimestamp();

    if (author) {
        embed.setAuthor({
            name: author.name,
            iconURL: author.iconURL || undefined,
            url: author.url || undefined,
        });
    }

    for (const field of fields) {
        embed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline ?? false,
        });
    }

    return embed;
}

/**
 * Green success embed with ✅ prefix.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function successEmbed(title, description) {
    return createEmbed({
        title: `✅ ${title}`,
        description,
        color: COLORS.SUCCESS,
    });
}

/**
 * Red error embed with ❌ prefix.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function errorEmbed(title, description) {
    return createEmbed({
        title: `❌ ${title}`,
        description,
        color: COLORS.ERROR,
    });
}

/**
 * Orange warning embed with ⚠️ prefix.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function warningEmbed(title, description) {
    return createEmbed({
        title: `⚠️ ${title}`,
        description,
        color: COLORS.WARNING,
    });
}

/**
 * Blue informational embed with ℹ️ prefix.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function infoEmbed(title, description) {
    return createEmbed({
        title: `ℹ️ ${title}`,
        description,
        color: COLORS.INFO,
    });
}

/**
 * Gold-themed economy embed with wallet & bank fields.
 * Displays the user's financial snapshot alongside custom content.
 *
 * @param {Object} options
 * @param {string}  options.title       — Embed title
 * @param {string}  options.description — Embed body text
 * @param {import('discord.js').User} [options.user] — Discord user (for avatar)
 * @param {number}  [options.balance]   — Wallet balance to display
 * @param {number}  [options.bank]      — Bank balance to display
 * @returns {EmbedBuilder}
 */
function economyEmbed({ title, description, user, balance, bank } = {}) {
    const fields = [];

    if (balance !== undefined) {
        fields.push({ name: '💰 Portefeuille', value: `🪙 ${Number(balance).toLocaleString('fr-FR')}`, inline: true });
    }
    if (bank !== undefined) {
        fields.push({ name: '🏦 Banque', value: `🪙 ${Number(bank).toLocaleString('fr-FR')}`, inline: true });
    }
    if (balance !== undefined && bank !== undefined) {
        const total = Number(balance) + Number(bank);
        fields.push({ name: '📊 Total', value: `🪙 ${total.toLocaleString('fr-FR')}`, inline: true });
    }

    const embedOptions = {
        title: `🪙 ${title}`,
        description,
        color: COLORS.ECONOMY,
        fields,
    };

    // Use the user's avatar as thumbnail when available
    if (user) {
        embedOptions.thumbnail = user.displayAvatarURL({ dynamic: true, size: 256 });
    }

    return createEmbed(embedOptions);
}

module.exports = {
    COLORS,
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    economyEmbed,
};
