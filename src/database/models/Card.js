const { DataTypes } = require('sequelize');

/**
 * Card model — defines a collectible card template.
 * Cards have rarity tiers, combat stats, and can be player-created.
 */
module.exports = (sequelize) => {
  const Card = sequelize.define('Card', {
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
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    rarity: {
      type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'),
      allowNull: false,
      defaultValue: 'common',
    },
    attack: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    defense: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    speed: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    image_url: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    /** Collection series name */
    series: {
      type: DataTypes.STRING,
      defaultValue: 'Série 1',
    },
    /** Weight for drop probability — higher value = more common */
    drop_rate: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    /** True if the card was created by a player */
    is_custom: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    /** Discord user ID of the custom card creator */
    creator_id: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  }, {
    tableName: 'cards',
  });

  return Card;
};
