const { DataTypes } = require('sequelize');

/**
 * UserCard model — represents a card owned by a user.
 * Links a user to a card template with a quantity and favorite flag.
 */
module.exports = (sequelize) => {
  const UserCard = sequelize.define('UserCard', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    card_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    obtained_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'user_cards',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'card_id'],
      },
    ],
  });

  return UserCard;
};
