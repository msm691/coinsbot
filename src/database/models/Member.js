const { DataTypes } = require('sequelize');

/**
 * Member model — per-guild member data (local economy).
 * Auto-increment integer primary key with a unique composite
 * index on (user_id, guild_id).
 */
module.exports = (sequelize) => {
  const Member = sequelize.define('Member', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ── Foreign keys ─────────────────────────────────────────
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID — FK to User',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild ID — FK to Guild',
    },

    // ── Local economy ────────────────────────────────────────
    local_balance: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    bank_balance: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },

    // ── Social / moderation ──────────────────────────────────
    reputation: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    warnings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    messages_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // ── Levelling ────────────────────────────────────────────
    local_xp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    tableName: 'members',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'guild_id'],
      },
    ],
  });

  return Member;
};
