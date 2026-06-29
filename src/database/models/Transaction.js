const { DataTypes } = require('sequelize');

/**
 * Transaction model — audit log for every money movement in the economy.
 * The automatic createdAt timestamp serves as the transaction date.
 */
module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    /** Discord user ID of the sender / source */
    from_user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    /** Discord user ID of the receiver (null if system-generated) */
    to_user_id: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    /** Guild where the transaction took place */
    guild_id: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tax_amount: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM(
        'transfer',
        'deposit',
        'withdraw',
        'daily',
        'work',
        'crime',
        'casino_win',
        'casino_loss',
        'shop_buy',
        'shop_sell',
        'team_deposit',
        'team_withdraw',
        'enterprise',
        'crypto_buy',
        'crypto_sell',
        'fine',
        'reward',
        'system',
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    /** Sender's balance after this transaction */
    balance_after: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
  }, {
    tableName: 'transactions',
  });

  return Transaction;
};
