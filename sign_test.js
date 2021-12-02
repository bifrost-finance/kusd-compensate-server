import { stringToU8a, u8aToHex } from "@polkadot/util";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import dotenv from "dotenv";
import { exit } from "yargs";
import { verifySignature } from "./graphql/utils/Common";
dotenv.config();

const BIFROST_END_POINT = process.env.BIFROST_END_POINT;

const test = async () => {
  const provider = new WsProvider(BIFROST_END_POINT);
  const api = await ApiPromise.create({ provider });
  await cryptoWaitReady();

  const keyring = new Keyring({ type: "sr25519" });
  // create Alice based on the development seed
  const bob = keyring.addFromUri("//Alice");

  // create the message, actual signature and verify
  const message = stringToU8a("check");
  const signature = bob.sign(message);
  const isValid = verifySignature(
    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    message,
    signature
  );

  // output the result
  console.log(`${u8aToHex(signature)} is ${isValid ? "valid" : "invalid"}`);
};

const main = async () => {
  await test();
  exit(0);
};

main();
