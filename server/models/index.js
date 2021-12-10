import Sequelize from "sequelize";
require("dotenv").config();

const Op = Sequelize.Op;

const sequelize = new Sequelize(process.env.POSTGRESQL_URI, {
  dialect: "postgres",
});

const models = {
  FirstClaims: require("./first_claims").default(sequelize, Sequelize),
  Overviews: require("./overviews").default(sequelize, Sequelize),
  SecondClaims: require("./second_claims").default(sequelize, Sequelize),
  UserKusds: require("./user_kusds").default(sequelize, Sequelize),
  Transfers: require("./transfers").default(sequelize, Sequelize),
};

Object.keys(models).forEach((key) => {
  if ("associate" in models[key]) {
    models[key].associate(models);
  }
});

export { sequelize };
export default models;
