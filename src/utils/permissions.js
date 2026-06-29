// ──────────────────────────────────────────────
//  CoinsBot — Permission Checking Utility
//  Tiered access control for bot commands
// ──────────────────────────────────────────────

const { PermissionFlagsBits } = require('discord.js');

/**
 * Bot owner's Discord user ID.
 * Set this to your own ID to unlock owner-only commands.
 * @type {string|null}
 */
const BOT_OWNER_ID = null;

/**
 * Checks if a guild member has the Administrator permission.
 *
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
    if (!member) return false;
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Checks if a guild member has moderator-level permissions.
 * Moderator = ManageGuild OR ManageMessages.
 *
 * @param {import('discord.js').GuildMember} member
 * @returns {boolean}
 */
function isModerator(member) {
    if (!member) return false;
    return (
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.ManageMessages)
    );
}

/**
 * Checks if a guild member is the guild (server) owner.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Guild}       guild
 * @returns {boolean}
 */
function isOwner(member, guild) {
    if (!member || !guild) return false;
    return member.id === guild.ownerId;
}

/**
 * Validates whether a member meets a required permission level.
 *
 * Levels (cumulative):
 *   - 'everyone'  — No restriction
 *   - 'moderator' — ManageGuild or ManageMessages (includes admins & owner)
 *   - 'admin'     — Administrator permission (includes owner)
 *   - 'owner'     — Server owner only
 *
 * @param {import('discord.js').GuildMember} member
 * @param {'everyone'|'moderator'|'admin'|'owner'} requiredLevel
 * @returns {{ allowed: boolean, message: string }}
 */
function checkPermission(member, requiredLevel) {
    if (!member) {
        return { allowed: false, message: '❌ Membre introuvable.' };
    }

    const guild = member.guild;

    // Bot owner bypasses all checks
    if (BOT_OWNER_ID && member.id === BOT_OWNER_ID) {
        return { allowed: true, message: '' };
    }

    switch (requiredLevel) {
        case 'everyone':
            return { allowed: true, message: '' };

        case 'moderator':
            if (isModerator(member) || isAdmin(member) || isOwner(member, guild)) {
                return { allowed: true, message: '' };
            }
            return {
                allowed: false,
                message: '❌ Cette commande nécessite les permissions de **Modérateur** (Gérer le serveur ou Gérer les messages).',
            };

        case 'admin':
            if (isAdmin(member) || isOwner(member, guild)) {
                return { allowed: true, message: '' };
            }
            return {
                allowed: false,
                message: '❌ Cette commande nécessite la permission **Administrateur**.',
            };

        case 'owner':
            if (isOwner(member, guild)) {
                return { allowed: true, message: '' };
            }
            return {
                allowed: false,
                message: '❌ Seul le **propriétaire du serveur** peut utiliser cette commande.',
            };

        default:
            return {
                allowed: false,
                message: `❌ Niveau de permission inconnu : \`${requiredLevel}\`.`,
            };
    }
}

module.exports = {
    BOT_OWNER_ID,
    isAdmin,
    isModerator,
    isOwner,
    checkPermission,
};
