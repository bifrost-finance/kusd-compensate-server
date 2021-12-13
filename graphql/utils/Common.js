import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import { sequelize } from "../../server/models";
import { Op } from "sequelize";

import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex, u8aToHex, stringToU8a } from "@polkadot/util";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";
import fs from "fs";
import XLSX from "xlsx";
import { SSL_OP_EPHEMERAL_RSA } from "constants";

dotenv.config();

// 环境变量
const TOTAL_KUSD = process.env.TOTAL_KUSD;
const COMPENSATE_COEFFICIENT = parseFloat(process.env.COMPENSATE_COEFFICIENT);
const FIRST_CLAIM_PROPORTION = parseFloat(process.env.FIRST_CLAIM_PROPORTION);
const DATA_PATH = process.env.DATA_PATH;
const BIFROST_END_POINT = process.env.BIFROST_END_POINT;
const START_BLOCK = parseInt(process.env.START_BLOCK);
const CHECKPOINT_BLOCK = parseInt(process.env.CHECKPOINT_BLOCK);
const MNEMONIC_PHRASE = process.env.MNEMONIC_PHRASE;

// 常量
export const BN_ZERO = new BigNumber(0);
export const MESSAGE = "check";

// 从数据库中获取数据，以及做一些常量的计算
export const getCalculationConsts = async (models) => {
  const rs = await models.Overviews.findOne({ raw: true });

  const start_block = rs.start_block;
  const checkpoint_block = rs.checkpoint_block;
  const total_kusd = rs.total_kusd;

  const total_compensation = new BigNumber(rs.total_kusd).multipliedBy(
    rs.compensate_coefficient
  );
  const first_claimable_total = total_compensation.multipliedBy(
    rs.first_claim_proportion
  );
  const first_claim_compensation_per_block = first_claimable_total.dividedBy(
    rs.checkpoint_block - rs.start_block
  );

  return {
    total_kusd,
    start_block,
    checkpoint_block,
    total_compensation,
    first_claimable_total,
    first_claim_compensation_per_block,
  };
};

// *************************
// return bignumber format. Only valid for single layer filed.
export const getSumOfAFieldFromList = (list, field) => {
  return list
    .map((item) => new BigNumber(item[field]))
    .reduce((a, b) => a.plus(b), new BigNumber(0));
};

// **************************************
// 从一个字符串数组获取查询的where in语句字符串
export const getStringQueryList = (stringList) => {
  if (stringList.length == 0) {
    return "";
  }

  let queryString = "(";
  let i;
  for (i = 0; i < stringList.length - 1; i++) {
    queryString += `'${stringList[i]}',`;
  }
  queryString += `'${stringList[i]}')`;

  return queryString;
};

/* ********************************** */
// 读数据，处理数据
/* ********************************** */
export const readSourceData = (data_path) => {
  let dataJson = [];
  if (data_path.endsWith("xlsx")) {
    const xlsxSheet = XLSX.readFile(data_path).Sheets["Sheet1"];
    dataJson = XLSX.utils.sheet_to_json(xlsxSheet);
  } else {
    dataJson = JSON.parse(fs.readFileSync(data_path));
  }

  let correctedList = [];

  for (const { account, value } of dataJson) {
    // 确保转化成bifrost地址
    let address = convertAddressFormat(account, 6);

    // 如果数额小于0，则置0
    let bnValue = new BigNumber(value);
    if (bnValue.isLessThan(BN_ZERO)) {
      bnValue = BN_ZERO;
    }

    // 如果账户及金额均显示正常，则放入数组里
    if (address && bnValue) {
      correctedList.push({
        account: address,
        value: bnValue.toFixed(0),
      });
    }
  }

  return correctedList;
};

/**
 * Convert address format
 * @param {string} addr The address you want to convert.
 * @param {number} ss58Format The format you want to convert.
 * @returns {string} The address converted.
 */
export const convertAddressFormat = (addr, ss58Format) => {
  let publicKey;
  try {
    // 如果是有效地址，刚对地址进行重新编码
    publicKey = isHex(addr) ? hexToU8a(addr) : decodeAddress(addr);
    return encodeAddress(publicKey, ss58Format);
  } catch {
    // 如果不是有效地址，则返回空
    return null;
  }
};

/* ***************初始化环境变量********* */
export const on_initialize = async (models) => {
  let overview_count = await models.Overviews.count();

  if (!overview_count) {
    await on_overview_initialize(models);
  }

  let user_kusds_count = await models.UserKusds.count();

  if (!user_kusds_count) {
    await on_user_kusds_initialize(models);
  }
};

// 如果overview表格为空，则进行表格初始化
const on_overview_initialize = async (models) => {
  const initOverviewData = {
    total_kusd: TOTAL_KUSD,
    compensate_coefficient: COMPENSATE_COEFFICIENT,
    start_block: START_BLOCK,
    checkpoint_block: CHECKPOINT_BLOCK,
    first_claim_proportion: FIRST_CLAIM_PROPORTION,
  };

  await models.Overviews.create(initOverviewData);
};

// 如果user_kusds表格为空，则进行表格初始化
const on_user_kusds_initialize = async (models) => {
  // 先读取文件
  let user_list = readSourceData(DATA_PATH);

  // 录入数据
  if (user_list != []) {
    await models.UserKusds.bulkCreate(user_list);
  }
};

/// 获取bifrost链api
export const getBifrostApi = async () => {
  const provider = new WsProvider(BIFROST_END_POINT);
  const api = await ApiPromise.create({ provider });
  await cryptoWaitReady();

  const keyring = new Keyring({ type: "sr25519" });
  const senderKeyring = keyring.addFromUri(MNEMONIC_PHRASE);

  return { api, senderKeyring };
};

/// 查询claims表格是否有记录
export const getClaimedAmount = async (claimRound, account, models) => {
  let condition = {
    where: {
      account: account,
    },
    raw: true,
  };

  let rs;
  if (claimRound == 2) {
    rs = await models.SecondClaims.findOne(condition);
  } else {
    rs = await models.FirstClaims.findOne(condition);
  }

  let claimed_amount = BN_ZERO;
  if (rs) {
    claimed_amount = new BigNumber(rs.claimed_amount);
  }

  return claimed_amount;
};

/// 获取现在这个时点，第一轮领取总额
export const getFirstClaimedTotal = async (models) => {
  let condition = {
    attributes: [
      [sequelize.literal(`SUM(claimed_amount::bigint)`), "total_claimed"],
      [sequelize.literal(`SUM(upper_limit::bigint)`), "total_limit"],
    ],
    raw: true,
  };

  let rs = (await models.FirstClaims.findAll(condition))[0];

  return {
    totalClaimed: new BigNumber(rs["total_claimed"] || 0),
    totalLimit: new BigNumber(rs["total_limit"] || 0),
  };
};

// 必须在第一轮结束之后调用这个数据才准。计算第二轮可供瓜分的数额
export const getSecondClaimableTotal = async (models) => {
  let { totalClaimed, totalLimit } = await getFirstClaimedTotal(models);

  let { first_claimable_total, total_compensation } =
    await getCalculationConsts(models);

  let yet_first_claims = first_claimable_total.minus(totalLimit);
  let second_claimable_total = total_compensation
    .minus(totalClaimed)
    .minus(yet_first_claims);

  return second_claimable_total;
};

// 验证用户身份
export const verifySignature = async (account, message, signature) => {
  const publicKey = decodeAddress(account);
  const hexPublicKey = u8aToHex(publicKey);

  const message_u8a = stringToU8a(message);
  const { isValid } = signatureVerify(message_u8a, signature, hexPublicKey);

  return isValid;
};

// 获取当前bifrost链的区块号
export const getCurrentBlock = async () => {
  const { api } = await getBifrostApi();
  const currentBlock = (
    await api.rpc.chain.getBlock()
  ).block.header.number.toHuman();

  return currentBlock;
};

// 获取用户在两轮的仍可领取金额
export const getUserClaimableAmount = async (account, models) => {
  let firstClaimableAmount = BN_ZERO;
  let secondClaimableAmount = BN_ZERO;

  let {
    total_kusd,
    start_block,
    checkpoint_block,
    first_claimable_total,
    first_claim_compensation_per_block,
  } = await getCalculationConsts(models);

  // 先查询用户是否在列表里
  let condition = {
    where: {
      account: account,
    },
    raw: true,
  };
  let rs = await models.UserKusds.findOne(condition);

  // 用户不存在，则返回0
  if (!rs) {
    return {
      firstClaimableAmount,
      secondClaimableAmount,
    };
  }

  // 获取现在bifrost链上区块。
  const currentBlock = await getCurrentBlock();

  const userPortion = new BigNumber(rs.value).dividedBy(total_kusd);

  let firstClaimed = await getClaimedAmount(1, account, models);
  // 如果now<checkpoint,则去查询first_claims有没有记录，没有的话，计算一个，已经有的话，返回0
  if (currentBlock < checkpoint_block) {
    // 说明没有取过第一次
    if (firstClaimed.isEqualTo(BN_ZERO)) {
      firstClaimableAmount = first_claim_compensation_per_block
        .multipliedBy(currentBlock - start_block)
        .multipliedBy(userPortion);
    }

    return {
      firstClaimableAmount,
      secondClaimableAmount,
    };
  }

  // 剩下能继续运行，说明currentBlock>=CHECKPOINT_BLOCK
  let secondClaimed = await getClaimedAmount(2, account, models);
  // 如果两次都没取过
  if (firstClaimed.isEqualTo(BN_ZERO) && secondClaimed.isEqualTo(BN_ZERO)) {
    firstClaimableAmount = first_claimable_total.multipliedBy(userPortion);

    secondClaimableAmount = (
      await getSecondClaimableTotal(models)
    ).multipliedBy(userPortion);
    // 第一次取过了，第二次没取过
  } else if (secondClaimed.isEqualTo(BN_ZERO)) {
    secondClaimableAmount = (
      await getSecondClaimableTotal(models)
    ).multipliedBy(userPortion);
  }

  return {
    firstClaimableAmount,
    secondClaimableAmount,
  };
};

// 签名并发送转账交易
export const transactionSignAndSend = async (
  models,
  firstClaimableAmount,
  secondClaimableAmount,
  account
) => {
  // 构造交易
  let { senderKeyring, api } = await getBifrostApi();
  let transaction = api.tx.balances.transfer(account, transfer_amount);
  let statusHash = null;
  let transfer_amount = firstClaimableAmount.plus(secondClaimableAmount);

  // 处理正常能获取的情况
  try {
    const unsub = await transaction.signAndSend(
      senderKeyring,
      { nonce: -1 },
      async ({ events = [], status }) => {
        // 如果交易已经被Finalized（只是说明被定性了，不代表成功了），且发的event是成功的，则交易就是成功的
        if (status.isFinalized) {
          events.filter((evt) => evt.method == "ExtrinsicSuccess");
          if (events.length > 0) {
            statusHash = status.asFinalized.toString();

            await revise_database(
              models,
              address,
              firstClaimableAmount,
              secondClaimableAmount,
              statusHash
            );
          }

          unsub();
        }
      }
    );

    return {
      status: "transfer_processed",
      message: total_claimable_amount.toFixed(0),
    };

    // 处理网络中断的情况或其它情况
  } catch (e) {
    let condition = {
      where: {
        account: account,
        amount: transfer_amount.toFixed(0),
      },
      raw: true,
    };

    // 查询三次是否已经交易成功，每次隔36秒（一共9个块左右），如果仍然没有一样的交易(2分钟以内)，则向前端返回交易不成功，如果成功了，刚修改数据库
    for (let i = 0; i < 3; i++) {
      condition["updated_at"] = {
        [Op.lte]: new Date(new Date() + 1000 * 2 * 60),
      };

      let rs = await models.Transfers.findOne(condition);
      if (rs) {
        statusHash = rs.extrinsic_hash;

        await revise_database(
          models,
          account,
          firstClaimableAmount,
          secondClaimableAmount,
          statusHash
        );

        return {
          status: "ok",
          message: transfer_amount.toFixed(0),
        };
      }

      sleep(36 * 1000);
    }

    return {
      status: "fail",
      message: "fail_to_transfer",
    };
  }
};

// sleep function
const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// revise database
const revise_database = async (
  models,
  address,
  firstClaimableAmount,
  secondClaimableAmount,
  statusHash
) => {
  // 修改数据库状态
  let condition = {
    where: {
      account: address,
    },
    raw: true,
  };
  const user_data = await models.UserKusds.findOne(condition);

  let { total_kusd, first_claimable_total } = await getCalculationConsts(
    models
  );
  const userPortion = new BigNumber(user_data.value).dividedBy(total_kusd);

  if (firstClaimableAmount.isGreaterThan(BN_ZERO)) {
    // 用户在第一阶段最多能领取的补偿
    const upper_limit = first_claimable_total.multipliedBy(userPortion);

    let new_data_1 = {
      account: address,
      upper_limit: upper_limit.toFixed(0),
      claimed_amount: firstClaimableAmount.toFixed(0),
      tx_hash: statusHash,
    };

    await models.FirstClaims.create(new_data_1);
  }

  if (secondClaimableAmount.isGreaterThan(BN_ZERO)) {
    let new_data_2 = {
      account: address,
      claimed_amount: secondClaimableAmount.toFixed(0),
      tx_hash: statusHash,
    };

    await models.SecondClaims.create(new_data_2);
  }
};
