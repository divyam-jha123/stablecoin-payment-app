import { hexToString, type Address, type Hex } from 'viem';
import { Abis } from 'viem/tempo';
import { PATH_USD, publicClient } from '../account/tempo';
import { ILLUSTRATIVE_INR_PER_PATH_USD } from './amount';
import {
  formatPaymentTime,
  toTransactionItem,
  type SimulatedPayment,
  type TransactionItem,
} from './simulated-payments';

/**
 * pathUSD received by the traveller's wallet on the Tempo testnet, read from
 * the token's Transfer events. Nothing here is simulated: each entry is a real
 * testnet transfer, such as another TravelPe user paying the receive QR.
 */
export type ReceivedTransfer = {
  /** `${txHash}:${logIndex}`, unique per transfer. */
  id: string;
  from: string;
  /** pathUSD in atomic units (6 decimals), as a decimal string. */
  amountAtomic: string;
  /** Memo text, such as a TravelPe payment reference (`TRV…`). */
  memo?: string;
  txHash: string;
  createdAt: number;
};

export type RawTransferLog = {
  from: string;
  to: string;
  amount: bigint;
  memo?: Hex;
  txHash: string;
  logIndex: number;
  blockTimestamp: number;
};

/** Reads the testnet chain head and pathUSD transfer logs into one wallet. */
export interface TransferLogReader {
  head(): Promise<bigint>;
  transfers(
    to: Address,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<RawTransferLog[]>;
  memos(
    to: Address,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<RawTransferLog[]>;
}

// Tempo's RPC accepts at most 100,000 blocks per log query.
export const MAX_LOG_RANGE = 99_999n;
// About two days of Tempo testnet blocks (~0.6 s each) on first load.
export const LOOKBACK_BLOCKS = 300_000n;
export const MAX_RECEIVED = 100;
// Network fees go to Tempo's fee manager; its refunds are not payments.
const FEE_MANAGER = '0xfeec000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const PATH_USD_SCALE = 1_000_000n;

const transferEvent = Abis.tip20.find(
  (item) => item.type === 'event' && item.name === 'Transfer',
)!;
const memoEvent = Abis.tip20.find(
  (item) => item.type === 'event' && item.name === 'TransferWithMemo',
)!;

function toRaw(log: {
  args: { from: Address; to: Address; amount: bigint; memo?: Hex };
  transactionHash: Hex | null;
  logIndex: number | null;
  blockTimestamp?: bigint | null | undefined;
}): RawTransferLog | null {
  const { from, to, amount, memo } = log.args;
  if (
    !from ||
    !to ||
    amount === undefined ||
    !log.transactionHash ||
    log.logIndex === null ||
    log.blockTimestamp === undefined ||
    log.blockTimestamp === null
  )
    return null;
  return {
    from,
    to,
    amount,
    ...(memo ? { memo } : {}),
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    blockTimestamp: Number(log.blockTimestamp),
  };
}

export const tempoTransferReader: TransferLogReader = {
  head: () => publicClient.getBlockNumber(),
  async transfers(to, fromBlock, toBlock) {
    const logs = await publicClient.getLogs({
      address: PATH_USD,
      event: transferEvent,
      args: { to },
      fromBlock,
      toBlock,
      strict: true,
    });
    return logs.map((log) => toRaw(log)).filter((log) => log !== null);
  },
  async memos(to, fromBlock, toBlock) {
    const logs = await publicClient.getLogs({
      address: PATH_USD,
      event: memoEvent,
      args: { to },
      fromBlock,
      toBlock,
      strict: true,
    });
    return logs.map((log) => toRaw(log)).filter((log) => log !== null);
  },
};

function memoText(memo: Hex | undefined) {
  if (!memo) return undefined;
  try {
    // Memos are right-padded with zero bytes; keep printable text only.
    const text = hexToString(memo).replace(/\0+$/, '');
    return /^[\x20-\x7e]{1,32}$/.test(text) ? text : undefined;
  } catch {
    return undefined;
  }
}

/** Transfers into `address` between two blocks, in RPC-sized chunks. */
export async function readReceivedTransfers(
  reader: TransferLogReader,
  address: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<ReceivedTransfer[]> {
  const ranges: [bigint, bigint][] = [];
  for (let start = fromBlock; start <= toBlock; start += MAX_LOG_RANGE + 1n) {
    const end = start + MAX_LOG_RANGE;
    ranges.push([start, end < toBlock ? end : toBlock]);
  }
  // One query at a time: the public testnet RPC rate limits bursts.
  const chunks: [RawTransferLog[], RawTransferLog[]][] = [];
  for (const [start, end] of ranges) {
    chunks.push([
      await reader.transfers(address, start, end),
      await reader.memos(address, start, end),
    ]);
  }
  const self = address.toLowerCase();
  const received: ReceivedTransfer[] = [];
  for (const [transfers, memos] of chunks) {
    for (const log of transfers) {
      const from = log.from.toLowerCase();
      if (
        log.to.toLowerCase() !== self ||
        from === self ||
        from === FEE_MANAGER
      )
        continue;
      // transferWithMemo emits Transfer then TransferWithMemo for the same move.
      const memo = memos.find(
        (item) =>
          item.txHash === log.txHash &&
          item.from.toLowerCase() === from &&
          item.amount === log.amount,
      )?.memo;
      const text = memoText(memo);
      received.push({
        id: `${log.txHash}:${log.logIndex}`,
        from,
        amountAtomic: log.amount.toString(),
        ...(text ? { memo: text } : {}),
        txHash: log.txHash,
        createdAt: log.blockTimestamp * 1000,
      });
    }
  }
  return received;
}

/** The INR value shown for a received pathUSD amount, at the demo rate. */
export function receivedInr(transfer: ReceivedTransfer) {
  const [whole = '0', fraction = ''] = ILLUSTRATIVE_INR_PER_PATH_USD.split('.');
  const ratePaise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  const paise =
    (BigInt(transfer.amountAtomic) * ratePaise + PATH_USD_SCALE / 2n) /
    PATH_USD_SCALE;
  return Number(paise) / 100;
}

export function toReceivedItem(transfer: ReceivedTransfer): TransactionItem {
  const faucet = transfer.from === ZERO_ADDRESS;
  return {
    id: transfer.id,
    // Matches the name on a wallet's receive QR.
    name: faucet
      ? 'Test funds'
      : `Received from Traveller ${transfer.from.slice(2, 6).toUpperCase()}`,
    category: faucet
      ? 'Tempo faucet'
      : transfer.memo?.startsWith('TRV')
        ? 'TravelPe transfer'
        : 'Tempo transfer',
    direction: 'Received',
    amount: receivedInr(transfer),
    time: formatPaymentTime(transfer.createdAt),
    token: 'pathUSD',
  };
}

/** Newest first, without duplicates, capped at MAX_RECEIVED. */
export function mergeReceived(
  saved: readonly ReceivedTransfer[],
  fresh: readonly ReceivedTransfer[],
) {
  const byId = new Map<string, ReceivedTransfer>();
  for (const transfer of [...saved, ...fresh]) byId.set(transfer.id, transfer);
  return [...byId.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_RECEIVED);
}

export interface ReceivedStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

type Saved = { scannedTo: string; transfers: ReceivedTransfer[] };

function isReceivedTransfer(value: unknown): value is ReceivedTransfer {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.from === 'string' &&
    typeof item.amountAtomic === 'string' &&
    /^\d+$/.test(item.amountAtomic) &&
    (item.memo === undefined || typeof item.memo === 'string') &&
    typeof item.txHash === 'string' &&
    typeof item.createdAt === 'number'
  );
}

function storageKey(address: string) {
  return `traveller.received-transfers.v1.${address.toLowerCase()}`;
}

/**
 * Keeps each wallet's received transfers on the device, so after the first
 * look back only new blocks are read.
 */
export function createReceivedTransfers(
  storage: ReceivedStorage,
  reader: TransferLogReader = tempoTransferReader,
) {
  async function load(address: string): Promise<Saved | null> {
    try {
      const saved = JSON.parse(
        (await storage.getItem(storageKey(address))) ?? 'null',
      ) as Partial<Saved> | null;
      if (
        !saved ||
        typeof saved.scannedTo !== 'string' ||
        !/^\d+$/.test(saved.scannedTo) ||
        !Array.isArray(saved.transfers)
      )
        return null;
      return {
        scannedTo: saved.scannedTo,
        transfers: saved.transfers.filter(isReceivedTransfer),
      };
    } catch {
      return null;
    }
  }

  return {
    /** Reads blocks since the last sync and returns all known transfers. */
    async sync(address: Address): Promise<ReceivedTransfer[]> {
      const saved = await load(address);
      const head = await reader.head();
      const earliest = head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n;
      const next = saved ? BigInt(saved.scannedTo) + 1n : earliest;
      const fromBlock = next > earliest ? next : earliest;
      if (fromBlock > head) return saved?.transfers ?? [];
      const fresh = await readReceivedTransfers(
        reader,
        address,
        fromBlock,
        head,
      );
      const transfers = mergeReceived(saved?.transfers ?? [], fresh);
      await storage
        .setItem(
          storageKey(address),
          JSON.stringify({ scannedTo: head.toString(), transfers }),
        )
        .catch(() => undefined);
      return transfers;
    },
  };
}

/** Sent payments and received transfers together, newest first. */
export function activityItems(
  payments: readonly SimulatedPayment[],
  received: readonly ReceivedTransfer[],
): TransactionItem[] {
  return [
    ...payments.map((payment) => ({
      createdAt: payment.createdAt,
      item: toTransactionItem(payment),
    })),
    ...received.map((transfer) => ({
      createdAt: transfer.createdAt,
      item: toReceivedItem(transfer),
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ item }) => item);
}
