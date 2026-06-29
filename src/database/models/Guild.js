const { DataTypes } = require('sequelize');

/**
 * Guild model — server configuration.
 * Primary key is the Discord guild ID.
 */
module.exports = (sequelize) => {
  const Guild = sequelize.define('Guild', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      comment: 'Discord guild ID',
    },

    // ── General settings ─────────────────────────────────────
    prefix: {
      type: DataTypes.STRING(10),
      defaultValue: '&',
      allowNull: false,
    },

    // ── Currency ─────────────────────────────────────────────
    currency_name: {
      type: DataTypes.STRING,
      defaultValue: 'coins',
      allowNull: false,
    },
    currency_emoji: {
      type: DataTypes.STRING,
      defaultValue: '🪙',
      allowNull: false,
    },
    tax_rate: {
      type: DataTypes.FLOAT,
      defaultValue: 0.05,
      allowNull: false,
      comment: 'Tax rate between 0.0 and 1.0',
    },

    // ── Channels ─────────────────────────────────────────────
    log_channel_id: {
      type: DataTypes.STRING,
      defaultValue: null,
      comment: 'Channel for bot logs',
    },
    welcome_channel_id: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    shop_channel_id: {
      type: DataTypes.STRING,
      defaultValue: null,
    },

    // ── Permissions / commands ────────────────────────────────
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Custom permission overrides',
    },
    disabled_commands: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'List of disabled command names',
    },

    // ── Locale ───────────────────────────────────────────────
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'Europe/Paris',
    },
  }, {
    tableName: 'guilds',
  });

  return Guild;
};
