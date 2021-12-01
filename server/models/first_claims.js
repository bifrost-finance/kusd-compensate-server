const first_claims = (sequelize, DataTypes) => {
  const FirstClaims = sequelize.define(
    "first_claims",
    {
      account: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      upper_limit: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      claimed_amount: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      claimed_block: {
        type: DataTypes.INTEGER,
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
