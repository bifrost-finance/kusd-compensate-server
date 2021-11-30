const overview = (sequelize, DataTypes) => {
  const Overviews = sequelize.define(
    "overview",
    {
      // 一个para_id可能有多场募集，所以用不同的id来标识
      total_kusd: {
        type: DataTypes.STRING,
      },
      compensate_coefficient: {
        type: DataTypes.DOUBLE,
      },
      checkpoint: {
        type: DataTypes.DATE,
      },
      first_claim_proportion: {
        type: DataTypes.DOUBLE,
      },
    },
    {
      underscored: true,
    }
  );

  return Overviews;
};

export default overview;
