/**
 * 🗄️ Models Index — Load & Associate All Sequelize Models
 * 
 * This file is the single source of truth for all database models.
 * It imports every model definition, registers it with the Sequelize
 * instance, and defines all inter-model relationships (associations).
 * 
 * Usage:
 *   const { User, Guild, Member, ... } = require('./database/models');
 */

const { sequelize } = require('../connection');

// ─── Import Model Definitions ───────────────────────────
const defineUser        = require('./User');
const defineGuild       = require('./Guild');
const defineMember      = require('./Member');
const defineTeam        = require('./Team');
const defineTeamMember  = require('./TeamMember');
const defineEnterprise  = require('./Enterprise');
const defineMarket      = require('./Market');
const defineCrypto      = require('./Crypto');
const defineInventory   = require('./Inventory');
const defineCard        = require('./Card');
const defineUserCard    = require('./UserCard');
const defineTransaction = require('./Transaction');

// ─── Register Models ────────────────────────────────────
const User        = defineUser(sequelize);
const Guild       = defineGuild(sequelize);
const Member      = defineMember(sequelize);
const Team        = defineTeam(sequelize);
const TeamMember  = defineTeamMember(sequelize);
const Enterprise  = defineEnterprise(sequelize);
const Market      = defineMarket(sequelize);
const Crypto      = defineCrypto(sequelize);
const Inventory   = defineInventory(sequelize);
const Card        = defineCard(sequelize);
const UserCard    = defineUserCard(sequelize);
const Transaction = defineTransaction(sequelize);

// ─── Define Associations ────────────────────────────────

// ── User ↔ Member (one-to-many) ─────────────────────────
// A user can be a member of multiple guilds
User.hasMany(Member, { foreignKey: 'user_id', as: 'memberships' });
Member.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── Guild ↔ Member (one-to-many) ────────────────────────
// A guild has many members
Guild.hasMany(Member, { foreignKey: 'guild_id', as: 'members' });
Member.belongsTo(Guild, { foreignKey: 'guild_id', as: 'guild' });

// ── User ↔ Enterprise (one-to-many) ────────────────────
// A user can own multiple enterprises
User.hasMany(Enterprise, { foreignKey: 'user_id', as: 'enterprises' });
Enterprise.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// ── User ↔ Inventory (one-to-many) ─────────────────────
// A user has many items in their inventory
User.hasMany(Inventory, { foreignKey: 'user_id', as: 'inventory' });
Inventory.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// ── User ↔ UserCard (one-to-many) ──────────────────────
// A user can own many cards
User.hasMany(UserCard, { foreignKey: 'user_id', as: 'cards' });
UserCard.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// ── Card ↔ UserCard (one-to-many) ──────────────────────
// A card definition can be owned by many users
Card.hasMany(UserCard, { foreignKey: 'card_id', as: 'owners' });
UserCard.belongsTo(Card, { foreignKey: 'card_id', as: 'card' });

// ── Team ↔ TeamMember (one-to-many) ────────────────────
// A team has many members
Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

// ── User ↔ TeamMember (one-to-many) ────────────────────
// A user can join teams (one at a time enforced at app level)
User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'teamMemberships' });
TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── User ↔ Transaction (one-to-many, as sender) ───────
// A user can make many transactions
User.hasMany(Transaction, { foreignKey: 'from_user_id', as: 'sentTransactions' });
Transaction.belongsTo(User, { foreignKey: 'from_user_id', as: 'sender' });

// ─── Export All Models ──────────────────────────────────
module.exports = {
    sequelize,
    User,
    Guild,
    Member,
    Team,
    TeamMember,
    Enterprise,
    Market,
    Crypto,
    Inventory,
    Card,
    UserCard,
    Transaction,
};
