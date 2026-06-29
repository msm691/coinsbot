const { DataTypes } = require('sequelize');

/**
 * User model — global user data (not tied to a specific guild).
 * Primary key is the Discord user ID.
 */
module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      comment: 'Discord user ID',
    },

    // ── Economy ──────────────────────────────────────────────
    global_balance: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
      comment: 'Wallet cash',
    },
    bank_balance: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    bank_limit: {
      type: DataTypes.BIGINT,
      defaultValue: 10000,
      allowNull: false,
    },

    // ── Levelling / XP ───────────────────────────────────────
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    xp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },

    // ── Job / RPG ────────────────────────────────────────────
    job: {
      type: DataTypes.STRING,
      defaultValue: null,
      comment: 'Current job name, null if none',
    },
    job_salary: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    skills: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'RPG skills object',
    },

    // ── Cooldowns ────────────────────────────────────────────
    last_daily: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    last_work: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    last_crime: {
      type: DataTypes.DATE,
      defaultValue: null,
    },

    // ── Prison ───────────────────────────────────────────────
    in_prison: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    prison_until: {
      type: DataTypes.DATE,
      defaultValue: null,
    },

    // ── Crypto ───────────────────────────────────────────────
    crypto_wallet: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Maps crypto symbol -> quantity owned',
    },
    printer_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Crypto printer upgrade level',
    },
    printer_last_collect: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  }, {
    tableName: 'users',
  });

  return User;
};
