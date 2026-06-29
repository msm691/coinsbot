const { DataTypes } = require('sequelize');

/**
 * Crypto model — defines a cryptocurrency available in the economy.
 * Tracks current/previous/lowest/highest prices, volatility, and supply.
 */
module.exports = (sequelize) => {
  const Crypto = sequelize.define('Crypto', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    symbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    current_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100.0,
    },
    previous_price: {
      type: DataTypes.FLOAT,
      defaultValue: 100.0,
    },
    lowest_price: {
      type: DataTypes.FLOAT,
      defaultValue: 100.0,
    },
    highest_price: {
      type: DataTypes.FLOAT,
      defaultValue: 100.0,
    },
    /** How much the price can swing each tick (0.0 – 1.0) */
    volatility: {
      type: DataTypes.FLOAT,
      defaultValue: 0.1,
    },
    market_cap: {
      type: DataTypes.BIGINT,
      defaultValue: 1000000,
    },
    total_supply: {
      type: DataTypes.BIGINT,
      defaultValue: 1000000,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    last_update: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'cryptos',
  });

  return Crypto;
};
