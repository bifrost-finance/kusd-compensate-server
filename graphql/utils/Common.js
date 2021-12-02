import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import { sequelize } from "../../server/models";

import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex } from "@polkadot/util";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import fs from "fs";
import XLSX from "xlsx";

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

  let a = {
    total_kusd,
    start_block,
    checkpoint_block,
    total_compensation,
    first_claimable_total,
    first_claim_compensation_per_block,
  };

  console.log("aaaaa: ", a);
  return a;
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

  console.log(correctedList);

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

  console.log("rs: ", rs);

  return {
    totalClaimed: new BigNumber(rs["total_claimed"] || 0),
    totalLimit: new BigNumber(rs["total_limit"] || 0),
  };
};

// 必须在第一轮结束之后调用这个数据才准。计算第二轮可供瓜分的数额
export const getSecondClaimableTotal = async (models) => {
  let { totalClaimed, totalLimit } = await getFirstClaimedTotal(models);

  let {
    first_claimable_total,
    total_compensation,
  } = await getCalculationConsts(models);

  let yet_first_claims = first_claimable_total.minus(totalLimit);
  let second_claimable_total = total_compensation
    .minus(totalClaimed)
    .minus(yet_first_claims);

  return second_claimable_total;
};

// 验证用户身份
export const verifySignature = async (account, message, signature) => {
  const message_u8a = stringToU8a(message);
  const { isValid } = signatureVerify(message_u8a, signature, account);

  return isValid;
};

// 获取当前bifrost链的区块号
export const getCurrentBlock = async () => {
  const { api } = await getBifrostApi();
  const currentBlock = (await api.rpc.chain.getBlock()).block.header.number;

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
  let compensation_base = BN_ZERO;
  if (rs) {
    compensation_base = new BigNumber(rs.value);
  } else {
    return {
      firstClaimableAmount: firstClaimableAmount.toFixed(0),
      secondClaimableAmount: secondClaimableAmount.toFixed(0),
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
      firstClaimableAmount: firstClaimableAmount.toFixed(0),
      secondClaimableAmount: secondClaimableAmount.toFixed(0),
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
    firstClaimableAmount: firstClaimableAmount.toFixed(0),
    secondClaimableAmount: secondClaimableAmount.toFixed(0),
  };
};

// 签名并发送转账交易
export const transactionSignAndSend = async (transfer_amount, account) => {
  // 构造交易
  let transaction = api.tx.balances.transfer(account, transfer_amount);
  let { senderKeyring } = await getBifrostApi();

  const unsub = await transaction.signAndSend(
    senderKeyring,
    async ({ status, dispatchError }) => {
      let rs;
      // 如果交易已经被执行
      if (status.isInBlock || status.isFinalized) {
        if (dispatchError != undefined) {
          rs = {
            status: "fail",
            massage: dispatchError.toString(),
          };
        } else {
          rs = {
            status: "ok",
            massage: "",
          };
        }
        unsub();

        return rs;
      }
    }
  );
};
