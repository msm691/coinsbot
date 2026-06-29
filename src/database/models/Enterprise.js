const { DataTypes } = require('sequelize');

/**
 * Enterprise model — player-owned businesses that generate revenue.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').Model}
 */
module.exports = (sequelize) => {
  const Enterprise = sequelize.define('Enterprise', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('restaurant', 'tech', 'mine', 'farm', 'factory', 'casino', 'bank'),
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    modules: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    employees: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    max_employees: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    revenue_per_hour: {
      type: DataTypes.BIGINT,
      defaultValue: 100,
    },
    last_collect: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    durability: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'enterprises',
  });

  return Enterprise;
};
