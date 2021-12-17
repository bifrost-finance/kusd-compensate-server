const second_claims = (sequelize, DataTypes) => {
  const SecondClaims = sequelize.define(
    "second_claims",
    {
      account: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      claimed_amount: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tx_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      block_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      underscored: true,
    }
  );

  return SecondClaims;
};

export default second_claims;
