const { DataTypes } = require('sequelize');

/**
 * Market model — global marketplace items available for purchase.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').Model}
 */
module.exports = (sequelize) => {
  const Market = sequelize.define('Market', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    sell_price: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: -1,
    },
    category: {
      type: DataTypes.ENUM('tool', 'weapon', 'consumable', 'collectible', 'special'),
      allowNull: false,
    },
    emoji: {
      type: DataTypes.STRING,
      defaultValue: '📦',
    },
    rarity: {
      type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
      defaultValue: 'common',
    },
    level_required: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    effects: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    is_buyable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_sellable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'market',
  });

  return Market;
};
