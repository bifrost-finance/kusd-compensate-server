import dotenv from "dotenv";
import { sequelize } from "../../server/models";
import { QueryTypes, Op } from "sequelize";
dotenv.config();

const MULTISIG_ACCOUNT = process.env.MULTISIG_ACCOUNT.split("|"); // 多签账户地址

// 初始化环境变量
const on_initialize = () => {};

// GraphQL查询的resolver
const Claims = {
  // ===========================================================================
  // ? QUERIES
  // ===========================================================================
  Query: {
    /// 查询某个账户现在可领取的BNC补偿金额
    getClaimableAmount: async (parent, { account }, { models }) => {
      return "0";
    },

    /// 验证某个签名是否由某个用户所签
    verifySignature: async (parent, { account, signature }, { models }) => {
      return false;
    },
  },
  // =============================================================================
  //? MUTATIONS
  // =============================================================================
  Mutation: {
    /// 修改用户领取补偿状态
    recordClaims: async (parent, { input }, { models }) => {
      let { account, claimed_amount } = input;

      return {
        status: "ok",
        massage: "",
      };
    },
  },
};

module.exports = Claims;
