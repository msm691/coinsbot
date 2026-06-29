// ──────────────────────────────────────────────
//  CoinsBot — Transaction & Mutex Utilities
//  Guarantees data integrity for economy operations
// ──────────────────────────────────────────────

const { Transaction } = require('sequelize');

/** Maximum allowed transaction amount */
const MAX_AMOUNT = 999_999_999_999;

/**
 * Application-level lock map.
 * Maps userId → Promise chain so operations on the same user are serialised.
 * @type {Map<string, Promise<any>>}
 */
const userLocks = new Map();

/**
 * Wraps a callback inside a Sequelize managed transaction with
 * SERIALIZABLE isolation level.  Automatically commits on success
 * and rolls back on error.
 *
 * @param {import('sequelize').Sequelize} sequelizeInstance — The Sequelize connection
 * @param {(t: import('sequelize').Transaction) => Promise<any>} callback — Receives the transaction object
 * @returns {Promise<any>} The value returned by the callback
 */
async function atomicTransaction(sequelizeInstance, callback) {
    const result = await sequelizeInstance.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
        async (t) => {
            return await callback(t);
        },
    );

    return result;
}

/**
 * Application-level mutex that serialises operations on a single user.
 *
 * All calls to `lockUser` with the same `userId` are queued — the next
 * callback only starts once the previous one resolves (or rejects).
 * This prevents race conditions when two commands modify the same user
 * concurrently (e.g., double-spend).
 *
 * @param {string} userId                 — The Discord user ID to lock on
 * @param {() => Promise<any>} callback   — The async work to execute under the lock
 * @returns {Promise<any>} The value returned by the callback
 */
async function lockUser(userId, callback) {
    // Get the current tail of this user's promise chain (or a resolved promise)
    const previous = userLocks.get(userId) || Promise.resolve();

    // Create a new promise that chains after the previous one
    const current = previous
        .catch(() => {})          // swallow previous errors so the chain continues
        .then(() => callback());  // execute this caller's work

    // Store the chain tail so the next caller queues behind us
    userLocks.set(userId, current);

    try {
        // Await our own result (may throw)
        return await current;
    } finally {
        // If we are still the tail, clean up to avoid memory leaks
        if (userLocks.get(userId) === current) {
            userLocks.delete(userId);
        }
    }
}

/**
 * Validates and sanitises a monetary amount.
 *
 * Checks:
 *   - Must be a number (not NaN, not Infinity)
 *   - Must be a positive integer
 *   - Must not exceed MAX_AMOUNT
 *
 * @param {any} amount — The value to validate
 * @returns {{ valid: boolean, amount: number, error: string }}
 */
function validateAmount(amount) {
    const num = Number(amount);

    if (isNaN(num)) {
        return { valid: false, amount: 0, error: 'Le montant doit être un nombre valide.' };
    }

    if (!isFinite(num)) {
        return { valid: false, amount: 0, error: 'Le montant ne peut pas être infini.' };
    }

    if (!Number.isInteger(num)) {
        return { valid: false, amount: 0, error: 'Le montant doit être un nombre entier.' };
    }

    if (num <= 0) {
        return { valid: false, amount: 0, error: 'Le montant doit être supérieur à 0.' };
    }

    if (num > MAX_AMOUNT) {
        return {
            valid: false,
            amount: 0,
            error: `Le montant ne peut pas dépasser ${MAX_AMOUNT.toLocaleString('fr-FR')}.`,
        };
    }

    return { valid: true, amount: num, error: '' };
}

module.exports = {
    atomicTransaction,
    lockUser,
    validateAmount,
    MAX_AMOUNT,
};
