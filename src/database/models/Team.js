const { DataTypes } = require('sequelize');

/**
 * Team model — alliance / team data.
 * Auto-increment integer primary key.
 */
module.exports = (sequelize) => {
  const Team = sequelize.define('Team', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ── Identity ─────────────────────────────────────────────
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tag: {
      type: DataTypes.STRING(5),
      allowNull: false,
      unique: true,
      comment: 'Short tag like [ABC]',
    },
    owner_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID of the team owner',
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: 'Aucune description.',
    },

    // ── Economy ──────────────────────────────────────────────
    treasury: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    max_members: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },

    // ── Military ─────────────────────────────────────────────
    troops: {
      type: DataTypes.JSON,
      defaultValue: { tier1: 0, tier2: 0, tier3: 0 },
      comment: 'Army composition',
    },
    wins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    losses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // ── Cooldowns ────────────────────────────────────────────
    last_attack: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    last_spy: {
      type: DataTypes.DATE,
      defaultValue: null,
    },

    // ── Recruitment ──────────────────────────────────────────
    is_recruiting: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'teams',
  });

  return Team;
};
