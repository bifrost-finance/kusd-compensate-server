import dotenv from "dotenv";
import {
  BN_ZERO,
  MESSAGE,
  on_initialize,
  convertAddressFormat,
  getUserClaimableAmount,
  verifySignature,
  transactionSignAndSend,
  getClaimedAmount,
} from "../utils/Common";
import BigNumber from "bignumber.js";

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

      // 做地址转换，并看地址是否正确
      let address = convertAddressFormat(account, 6);
      if (!address) {
        return {
          firstClaimableAmount: "0",
          secondClaimableAmount: "0",
        };
      }

      let { firstClaimableAmount, secondClaimableAmount, theoryCompensation } =
        await getUserClaimableAmount(address, models);
      return {
        firstClaimableAmount: firstClaimableAmount.toFixed(0),
        secondClaimableAmount: secondClaimableAmount.toFixed(0),
        theoryCompensation: theoryCompensation.toFixed(0),
      };
    },

    /// 查询某个账户已领取的BNC补偿金额
    getClaimedAmount: async (parent, { account }, { models }) => {
      // 看看表格是否已经初始化，没有的话就初始化
      await on_initialize(models);

      // 做地址转换，并看地址是否正确
      let address = convertAddressFormat(account, 6);
      if (!address) {
        return {
          firstClaimed: "0",
          secondClaimed: "0",
        };
      }

      let firstClaimed = await getClaimedAmount(1, address, models);
      let secondClaimed = await getClaimedAmount(2, address, models);
      return {
        firstClaimed: firstClaimed.toFixed(0),
        secondClaimed: secondClaimed.toFixed(0),
      };
    },
  },
  // =============================================================================
  //? MUTATIONS
  // =============================================================================
  Mutation: {
    /// 用户领取补偿
    claimCompensation: async (parent, { input }, { models }) => {
      await on_initialize(models);

      let { account, signature } = input;

      let address = convertAddressFormat(account, 6);

      if (!address) {
        return {
          status: "fail",
          message: "incorrect_address",
        };
      }

      let verified = verifySignature(address, MESSAGE, signature);
      if (!verified) {
        return {
          status: "fail",
          message: "signature_invalid",
        };
      }

      // 获取可领取金额
      let { firstClaimableAmount, secondClaimableAmount } =
        await getUserClaimableAmount(address, models);

      let total_claimable_amount = firstClaimableAmount.plus(
        secondClaimableAmount
      );

      // 转账
      if (total_claimable_amount.isGreaterThan(BN_ZERO)) {
        let rs = await transactionSignAndSend(
          models,
          firstClaimableAmount,
          secondClaimableAmount,
          address
        );

        return rs;
      } else {
        return {
          status: "fail",
          message: "transfer_amount_not_greater_than_zero",
        };
      }
    },
  },
};

module.exports = Claims;
