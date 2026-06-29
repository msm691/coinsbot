// ──────────────────────────────────────────────
//  CoinsBot — Cooldown Manager
//  Prevents command spam with per-user, per-command cooldowns
// ──────────────────────────────────────────────

/**
 * Manages cooldowns for all commands.
 * Internal structure: Map<commandName, Map<userId, expiresAtTimestamp>>
 */
class CooldownManager {
    constructor() {
        /** @type {Map<string, Map<string, number>>} */
        this.cooldowns = new Map();
    }

    /**
     * Check whether a user is currently on cooldown for a command.
     *
     * @param {string} commandName — The command identifier
     * @param {string} userId      — The Discord user ID
     * @param {number} cooldownMs  — The cooldown duration in milliseconds
     * @returns {{ onCooldown: boolean, remaining: number }} remaining is ms left (0 if not on cooldown)
     */
    check(commandName, userId, cooldownMs) {
        const commandCooldowns = this.cooldowns.get(commandName);
        if (!commandCooldowns) {
            return { onCooldown: false, remaining: 0 };
        }

        const expiresAt = commandCooldowns.get(userId);
        if (!expiresAt) {
            return { onCooldown: false, remaining: 0 };
        }

        const now = Date.now();
        if (now >= expiresAt) {
            // Cooldown has expired — clean it up
            commandCooldowns.delete(userId);
            return { onCooldown: false, remaining: 0 };
        }

        return { onCooldown: true, remaining: expiresAt - now };
    }

    /**
     * Set a cooldown for a user on a specific command.
     *
     * @param {string} commandName — The command identifier
     * @param {string} userId      — The Discord user ID
     * @param {number} cooldownMs  — The cooldown duration in milliseconds
     */
    set(commandName, userId, cooldownMs) {
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Map());
        }

        const commandCooldowns = this.cooldowns.get(commandName);
        commandCooldowns.set(userId, Date.now() + cooldownMs);
    }

    /**
     * Remove a user's cooldown for a specific command.
     *
     * @param {string} commandName — The command identifier
     * @param {string} userId      — The Discord user ID
     */
    clear(commandName, userId) {
        const commandCooldowns = this.cooldowns.get(commandName);
        if (commandCooldowns) {
            commandCooldowns.delete(userId);

            // Clean up empty command maps
            if (commandCooldowns.size === 0) {
                this.cooldowns.delete(commandName);
            }
        }
    }

    /**
     * Formats a millisecond duration into a human-readable French string.
     * Example: 150000 → "2m 30s"
     *
     * @param {number} ms — Duration in milliseconds
     * @returns {string}
     */
    formatRemaining(ms) {
        if (ms <= 0) return '0s';

        const totalSeconds = Math.ceil(ms / 1000);
        const hours   = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (hours > 0)   parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0) parts.push(`${seconds}s`);

        return parts.join(' ') || '0s';
    }
}

// Export both the class and a ready-to-use singleton
const cooldownManager = new CooldownManager();

module.exports = { CooldownManager, cooldownManager };
