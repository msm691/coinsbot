// ──────────────────────────────────────────────
//  CoinsBot — Secure RNG Utilities
//  Cryptographically secure randomness for casino & games
// ──────────────────────────────────────────────

const crypto = require('crypto');

/**
 * Returns a cryptographically secure random integer in [min, max).
 * Uses Node.js crypto.randomInt which is CSPRNG-backed.
 *
 * @param {number} min — Inclusive lower bound
 * @param {number} max — Exclusive upper bound
 * @returns {number}
 */
function secureRandom(min, max) {
    return crypto.randomInt(min, max);
}

/**
 * Returns a cryptographically secure random float in [0, 1).
 * Generated from 8 random bytes converted to a 64-bit fraction.
 *
 * @returns {number}
 */
function secureRandomFloat() {
    const bytes = crypto.randomBytes(8);
    // Use 52 bits (the mantissa precision of a JS double)
    const high = bytes.readUInt32BE(0) & 0x000FFFFF; // 20 bits
    const low  = bytes.readUInt32BE(4);               // 32 bits
    // Combine into a 52-bit integer, then divide by 2^52
    return (high * 0x100000000 + low) / 0x10000000000000;
}

/**
 * Selects a random value from a weighted list using secure randomness.
 *
 * @param {{ value: any, weight: number }[]} items — Array of { value, weight }
 * @returns {any} The selected value
 * @throws {Error} If items is empty or weights are invalid
 */
function weightedRandom(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('weightedRandom: le tableau ne peut pas être vide.');
    }

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) {
        throw new Error('weightedRandom: le poids total doit être supérieur à 0.');
    }

    let roll = secureRandomFloat() * totalWeight;

    for (const item of items) {
        roll -= item.weight;
        if (roll < 0) return item.value;
    }

    // Fallback (should not happen due to float precision)
    return items[items.length - 1].value;
}

/**
 * Fisher-Yates shuffle using cryptographically secure random swaps.
 * Returns a new shuffled array — the original is not mutated.
 *
 * @template T
 * @param {T[]} arr — The array to shuffle
 * @returns {T[]} A new shuffled copy
 */
function shuffleArray(arr) {
    const shuffled = [...arr];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = secureRandom(0, i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Rolls a die with the given number of sides.
 *
 * @param {number} sides — Number of sides (default: 6)
 * @returns {number} A value from 1 to sides (inclusive)
 */
function rollDice(sides = 6) {
    return secureRandom(1, sides + 1);
}

/**
 * Flips a coin.
 *
 * @returns {'heads'|'tails'}
 */
function flipCoin() {
    return secureRandom(0, 2) === 0 ? 'heads' : 'tails';
}

/**
 * Draws `count` cards from a deck without replacement.
 * Returns an object with the drawn cards and the remaining deck.
 * Both the original deck array and deck contents are left untouched.
 *
 * @template T
 * @param {number} count — Number of cards to draw
 * @param {T[]}    deck  — The deck to draw from
 * @returns {{ drawn: T[], remaining: T[] }}
 */
function drawCards(count, deck) {
    if (!Array.isArray(deck) || deck.length === 0) {
        return { drawn: [], remaining: [] };
    }

    const available = [...deck];
    const drawn = [];
    const toDraw = Math.min(count, available.length);

    for (let i = 0; i < toDraw; i++) {
        const index = secureRandom(0, available.length);
        drawn.push(available.splice(index, 1)[0]);
    }

    return { drawn, remaining: available };
}

module.exports = {
    secureRandom,
    secureRandomFloat,
    weightedRandom,
    shuffleArray,
    rollDice,
    flipCoin,
    drawCards,
};
