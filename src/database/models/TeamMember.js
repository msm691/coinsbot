const { DataTypes } = require('sequelize');

/**
 * TeamMember model — tracks team membership, rank, and contributions.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').Model}
 */
module.exports = (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rank: {
      type: DataTypes.ENUM('leader', 'co-leader', 'officer', 'member', 'recruit'),
      defaultValue: 'recruit',
      allowNull: false,
    },
    contributed: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'team_members',
    indexes: [
      {
        unique: true,
        fields: ['team_id', 'user_id'],
      },
    ],
  });

  return TeamMember;
};
