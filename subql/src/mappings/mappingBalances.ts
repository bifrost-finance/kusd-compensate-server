import { SubstrateBlock, SubstrateEvent } from "@subql/types";
import { BlockNumber, Balance, MessageId } from "@polkadot/types/interfaces";
import { BalancesTransfer } from '../types/models';


export async function handleBalancesTransfer(event: SubstrateEvent): Promise<void> {
  const blockNumber = event.block.block.header.number.toNumber();

  const { event: { data: [from, to, balance] } } = event;
  if (from.toString() === "") {
    const record = new BalancesTransfer(blockNumber.toString() + '-' + event.idx.toString());
    record.block_height = blockNumber;
    record.event_id = event.idx;
    record.extrinsic_id = event.extrinsic ? event.extrinsic.idx : null;
    record.extrinsic_hash = event.extrinsic ? event.extrinsic.extrinsic.hash.toString() : null;
    record.block_timestamp = event.block.timestamp;
    record.account = to.toString();
    record.amount = (balance as Balance).toBigInt();
    await record.save();
  }
}