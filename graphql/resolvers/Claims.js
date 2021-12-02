import dotenv from "dotenv";
import {
  BN_ZERO,
  MESSAGE,
  on_initialize,
  getCurrentBlock,
  convertAddressFormat,
  getUserClaimableAmount,
  getCalculationConsts,
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

      let { total_kusd, first_claimable_total } = await getCalculationConsts(
        models
      );

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
      let rs;
      if (total_claimable_amount.isGreaterThan(BN_ZERO)) {
        rs = await transactionSignAndSend(
          total_claimable_amount.toFixed(0),
          address
        );

        // 修改数据库状态
        const condition = {
          where: {
            account: address,
          },
          raw: true,
        };
        const user_data = await models.UserKusds.findOne(condition);

        const userPortion = new BigNumber(user_data.value).dividedBy(
          total_kusd
        );

        const currentBlock = await getCurrentBlock();
        if (firstClaimableAmount.isGreaterThan(BN_ZERO)) {
          // 用户在第一阶段最多能领取的补偿
          const upper_limit = first_claimable_total.multipliedBy(userPortion);

          let new_data_1 = {
            account: address,
            upper_limit: upper_limit.toFixed(0),
            claimed_amount: firstClaimableAmount.toFixed(0),
            claimed_block: currentBlock,
          };

          await models.FirstClaims.create(new_data_1);
        }

        if (secondClaimableAmount.isGreaterThan(BN_ZERO)) {
          let new_data_2 = {
            account: address,
            claimed_amount: secondClaimableAmount.toFixed(0),
            claimed_block: currentBlock,
          };

          await models.SecondClaims.create(new_data_2);
        }

        return rs;
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
