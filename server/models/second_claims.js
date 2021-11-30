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
      timestamp: {
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
