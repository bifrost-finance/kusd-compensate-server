import dotenv from "dotenv";
import { sequelize } from "../../server/models";
import { QueryTypes, Op } from "sequelize";
import { on_initialize } from "../utils/Common";
dotenv.config();

// GraphQL查询的resolver
const Claims = {
  // ===========================================================================
  // ? QUERIES
  // ===========================================================================
  Query: {
    /// 查询某个账户现在可领取的BNC补偿金额
    getClaimableAmount: async (parent, { account }, { models }) => {
      // 看看表格是否已经初始化，没有的话就初始化
      await on_initialize(models);

      return "0";
    },

    /// 验证某个签名是否由某个用户所签
    verifySignature: async (parent, { account, signature }, { models }) => {
      await on_initialize(models);
      return false;
    },
  },
  // =============================================================================
  //? MUTATIONS
  // =============================================================================
  Mutation: {
    /// 修改用户领取补偿状态
    recordClaims: async (parent, { input }, { models }) => {
      await on_initialize(models);

      let { account, claimed_amount } = input;

      return {
        status: "ok",
        massage: "",
      };
    },
  },
};

module.exports = Claims;
