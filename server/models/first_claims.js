const first_claims = (sequelize, DataTypes) => {
  const FirstClaims = sequelize.define(
    "first_claims",
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

  return FirstClaims;
};

export default first_claims;
