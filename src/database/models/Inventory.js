const { DataTypes } = require('sequelize');

/**
 * Inventory model — tracks items owned by each user.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').Model}
 */
module.exports = (sequelize) => {
  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    equipped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    obtained_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'inventories',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'item_name'],
      },
    ],
  });

  return Inventory;
};
