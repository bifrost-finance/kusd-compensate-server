const user_kusds = (sequelize, DataTypes) => {
  const UserKusds = sequelize.define(
    "user_kusds",
    {
      account: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      kusd_amount: {
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
    }
  );

  return UserKusds;
};

export default user_kusds;
