import BigNumber from "bignumber.js";
import dotenv from "dotenv";

import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex, bnToBn } from "@polkadot/util";
import fs from "fs";
import XLSX from "xlsx";

dotenv.config();

// 环境变量
const TOTAL_KUSD = process.env.TOTAL_KUSD;
const COMPENSATE_COEFFICIENT = parseFloat(process.env.COMPENSATE_COEFFICIENT);
const START_BLOCK = parseInt(process.env.START_BLOCK);
const CHECKPOINT_BLOCK = parseInt(process.env.CHECKPOINT_BLOCK);
const FIRST_CLAIM_PROPORTION = parseFloat(process.env.FIRST_CLAIM_PROPORTION);
const DATA_PATH = process.env.DATA_PATH;

const BN_ZERO = new BigNumber(0);

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
