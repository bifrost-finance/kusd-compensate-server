import BigNumber from "bignumber.js";
import dotenv from "dotenv";
dotenv.config();

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
