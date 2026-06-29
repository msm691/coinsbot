// ──────────────────────────────────────────────
//  CoinsBot — Formatting Utilities
//  Consistent number, money, and text formatting
// ──────────────────────────────────────────────

/**
 * Formats a number with French locale separators.
 * Example: 1234567 → "1 234 567"
 *
 * @param {number} num — The number to format
 * @returns {string}
 */
function formatNumber(num) {
    return Number(num).toLocaleString('fr-FR');
}

/**
 * Formats a monetary amount with a currency emoji prefix.
 * Example: formatMoney(1234567) → "🪙 1 234 567"
 *
 * @param {number} amount        — The amount
 * @param {string} currencyEmoji — Emoji prefix (default: 🪙)
 * @returns {string}
 */
function formatMoney(amount, currencyEmoji = '🪙') {
    return `${currencyEmoji} ${formatNumber(amount)}`;
}

/**
 * Converts a millisecond duration into a human-readable French string.
 * Example: 90061000 → "1 jour, 1 heure, 1 minute, 1 seconde"
 *
 * @param {number} ms — Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
    if (ms <= 0) return '0 seconde';

    const totalSeconds = Math.floor(ms / 1000);
    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0)    parts.push(`${days} ${days === 1 ? 'jour' : 'jours'}`);
    if (hours > 0)   parts.push(`${hours} ${hours === 1 ? 'heure' : 'heures'}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    if (seconds > 0) parts.push(`${seconds} ${seconds === 1 ? 'seconde' : 'secondes'}`);

    return parts.join(', ') || '0 seconde';
}

/**
 * Truncates a string to a maximum length, appending an ellipsis if needed.
 *
 * @param {string} str    — The string to truncate
 * @param {number} maxLen — Maximum allowed length (default: 50)
 * @returns {string}
 */
function truncate(str, maxLen = 50) {
    if (typeof str !== 'string') return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}

/**
 * Generates a text-based progress bar.
 * Example: progressBar(7, 10, 10) → "▓▓▓▓▓▓▓░░░"
 *
 * @param {number} current — Current value
 * @param {number} max     — Maximum value
 * @param {number} length  — Character width of the bar (default: 10)
 * @returns {string}
 */
function progressBar(current, max, length = 10) {
    const ratio = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(ratio * length);
    const empty  = length - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Returns a random element from an array.
 *
 * @template T
 * @param {T[]} arr — Source array
 * @returns {T}
 */
function randomFromArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} str — The string to capitalize
 * @returns {string}
 */
function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parses a flexible amount string into a numeric value.
 * Supports:
 *   - Plain numbers:       "1000"   → 1000
 *   - 'all' / 'tout' / 'max':       → currentBalance
 *   - 'half' / 'moitié':            → Math.floor(currentBalance / 2)
 *   - Percentages:         "50%"    → Math.floor(currentBalance * 0.5)
 *
 * @param {string} str            — The user-provided amount string
 * @param {number} currentBalance — The user's current wallet balance
 * @returns {number|null} The parsed amount, or null if invalid
 */
function parseAmount(str, currentBalance) {
    if (typeof str !== 'string') return null;

    const input = str.trim().toLowerCase();
    if (!input) return null;

    // Keywords: all / tout / max → full balance
    if (['all', 'tout', 'max'].includes(input)) {
        return currentBalance;
    }

    // Keywords: half / moitié → half balance
    if (['half', 'moitié', 'moitie'].includes(input)) {
        return Math.floor(currentBalance / 2);
    }

    // Percentage: "50%" → proportional amount
    if (input.endsWith('%')) {
        const pct = parseFloat(input.slice(0, -1));
        if (isNaN(pct) || pct <= 0 || pct > 100) return null;
        return Math.floor(currentBalance * (pct / 100));
    }

    // Plain number
    const num = Number(input);
    if (isNaN(num) || !isFinite(num) || num <= 0 || !Number.isInteger(num)) {
        return null;
    }

    return num;
}

module.exports = {
    formatNumber,
    formatMoney,
    formatDuration,
    truncate,
    progressBar,
    randomFromArray,
    capitalize,
    parseAmount,
};
