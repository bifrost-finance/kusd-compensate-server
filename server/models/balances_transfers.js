const balances_transfers = (sequelize, DataTypes) => {
  const BalancesTransfers = sequelize.define(
    "balances_transfers",
    {
      account: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      amount: {
        type: DataTypes.STRING,
      },
      extrinsic_hash: {
        type: DataTypes.STRING,
      },
      block_height: {
        type: DataTypes.INTEGER,
      },
      block_timestamp: {
        type: DataTypes.DATE,
      },
    },
    {
      underscored: true,
    }
  );

  return BalancesTransfers;
};

export default balances_transfers;
