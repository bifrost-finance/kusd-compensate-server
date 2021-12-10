import dotenv from "dotenv";
import {
  BN_ZERO,
  MESSAGE,
  on_initialize,
  convertAddressFormat,
  getUserClaimableAmount,
  verifySignature,
  transactionSignAndSend,
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

      let {
        firstClaimableAmount,
        secondClaimableAmount,
      } = await getUserClaimableAmount(address, models);
      return {
        firstClaimableAmount: firstClaimableAmount.toFixed(0),
        secondClaimableAmount: secondClaimableAmount.toFixed(0),
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
          massage: "incorrect_address",
        };
      }

      let verified = verifySignature(address, MESSAGE, signature);
      if (!verified) {
        return {
          status: "fail",
          massage: "signature_invalid",
        };
      }

      // 获取可领取金额
      let {
        firstClaimableAmount,
        secondClaimableAmount,
      } = await getUserClaimableAmount(address, models);

      let total_claimable_amount = firstClaimableAmount.plus(
        secondClaimableAmount
      );

      // 转账
      if (total_claimable_amount.isGreaterThan(BN_ZERO)) {
        await transactionSignAndSend(
          models,
          firstClaimableAmount,
          secondClaimableAmount,
          address
        );

        // callback不能马上有结果，所以不能获取即时回馈
        // // 最后再查询一下数据库，如果有，则通知前端成功了，如果没有，则通知失败
        // let condition = {
        //   where: {
        //     account: address,
        //   },
        //   raw: true,
        // };

        // const first_record = await models.FirstClaims.findOne(condition);
        // const second_record = await models.SecondClaims.findOne(condition);

        // let transfer_amount = new BigNumber(0);
        // if (first_record && second_record) {
        //   transfer_amount = total_claimable_amount;
        // } else if (first_record) {
        //   transfer_amount = firstClaimableAmount;
        // }

        return {
          status: "ok",
          massage: total_claimable_amount.toFixed(0),
        };
      } else {
        return {
          status: "fail",
          massage: "transfer_amount_not_greater_than_zero",
        };
      }
    },
  },
};

module.exports = Claims;
