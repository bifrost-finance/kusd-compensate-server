import dotenv from "dotenv";
import {
  BN_ZERO,
  on_initialize,
  getCurrentBlock,
  FIRST_CLAIMABLE_TOTAL,
} from "../utils/Common";
import BigNumber from "bignumber.js";
dotenv.config();

// 环境变量

const CHECKPOINT_BLOCK = parseInt(process.env.CHECKPOINT_BLOCK);

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

      return getUserClaimableAmount(address);
    },
  },
  // =============================================================================
  //? MUTATIONS
  // =============================================================================
  Mutation: {
    /// 用户领取补偿
    claimCompensation: async (parent, { input }, { models }) => {
      await on_initialize(models);

      let { account } = input;
      let address = convertAddressFormat(account, 6);

      if (!address) {
        return {
          status: "fail",
          massage: "incorrect_address",
        };
      }

      // 获取可领取金额
      let {
        firstClaimableAmount,
        secondClaimableAmount,
      } = await getUserClaimableAmount(address);

      let total_claimable_amount = firstClaimableAmount.plus(
        secondClaimableAmount
      );

      // 转账
      let rs;
      if (total_claimable_amount.isGreaterThan(BN_ZERO)) {
        rs = await transactionSignAndSend(transfer_amount, address);

        // 修改数据库状态
        const condition = {
          where: {
            account: address,
          },
          raw: true,
        };
        const user_data = await models.UserKusds.findOne(condition);
        const userPortion = new BigNumber(user_data.value).dividedBy(
          TOTAL_KUSD
        );

        const currentBlock = await getCurrentBlock();
        if (firstClaimableAmount.isGreaterThan(BN_ZERO)) {
          // 用户在第一阶段最多能领取的补偿
          const upper_limit = FIRST_CLAIMABLE_TOTAL.multipliedBy(userPortion);

          let new_data = {
            account: address,
            upper_limit,
            claimed_amount: firstClaimableAmount.toFixed(0),
            claimed_block: currentBlock,
          };

          await models.FirstClaims.create(new_data);
        }

        if (secondClaimableAmount.isGreaterThan(BN_ZERO)) {
          let new_data = {
            account: address,
            claimed_amount: secondClaimableAmount.toFixed(0),
            claimed_block: currentBlock,
          };

          await models.SecondClaims.create(new_data);
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
