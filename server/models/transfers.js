const transfers = (sequelize, DataTypes) => {
  const Transfers = sequelize.define(
    "transfers",
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
    },
    {
      underscored: true,
    }
  );

  return Transfers;
};

export default transfers;
