import { describe, expect, it, vi } from 'vitest';
import { padHex, stringToHex, type Address } from 'viem';
import {
  activityItems,
  createReceivedTransfers,
  LOOKBACK_BLOCKS,
  MAX_LOG_RANGE,
  readReceivedTransfers,
  toReceivedItem,
  type RawTransferLog,
  type TransferLogReader,
} from './received-transfers';

const me = '0x1111111111111111111111111111111111111111' as Address;
const friend = '0xabcd222222222222222222222222222222222222';
const tx = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

function log(overrides: Partial<RawTransferLog> = {}): RawTransferLog {
  return {
    from: friend,
    to: me,
    amount: 1_000_000n,
    txHash: tx(1),
    logIndex: 0,
    blockTimestamp: 1_700_000_000,
    ...overrides,
  };
}

function reader(
  transfers: RawTransferLog[],
  memos: RawTransferLog[] = [],
  head = 1_000_000n,
) {
  return {
    head: vi.fn(async () => head),
    transfers: vi.fn<TransferLogReader['transfers']>(async () => transfers),
    memos: vi.fn<TransferLogReader['memos']>(async () => memos),
  } satisfies TransferLogReader;
}

describe('received testnet transfers', () => {
  it('keeps transfers into the wallet with their TravelPe memo', async () => {
    const memo = padHex(stringToHex('TRV123456789012'), {
      dir: 'right',
      size: 32,
    });
    const source = reader(
      [
        log(),
        // Fee refunds, self transfers and other recipients are not payments.
        log({
          from: '0xfeEC000000000000000000000000000000000000',
          logIndex: 2,
        }),
        log({ from: me, logIndex: 3 }),
        log({ to: friend, logIndex: 4 }),
      ],
      [log({ memo, logIndex: 1 })],
    );
    const received = await readReceivedTransfers(source, me, 0n, 10n);
    expect(received).toEqual([
      {
        id: `${tx(1)}:0`,
        from: friend,
        amountAtomic: '1000000',
        memo: 'TRV123456789012',
        txHash: tx(1),
        createdAt: 1_700_000_000_000,
      },
    ]);
    expect(toReceivedItem(received[0]!)).toMatchObject({
      name: 'Received from Traveller ABCD',
      category: 'TravelPe transfer',
      direction: 'Received',
      amount: 83,
      token: 'pathUSD',
    });
  });

  it('labels faucet mints as test funds', async () => {
    const [faucet] = await readReceivedTransfers(
      reader([log({ from: '0x0000000000000000000000000000000000000000' })]),
      me,
      0n,
      10n,
    );
    expect(toReceivedItem(faucet!)).toMatchObject({
      name: 'Test funds',
      category: 'Tempo faucet',
    });
  });

  it('splits long ranges into RPC-sized queries', async () => {
    const source = reader([]);
    await readReceivedTransfers(source, me, 0n, MAX_LOG_RANGE * 2n + 10n);
    expect(
      source.transfers.mock.calls.map((call) => [call[1], call[2]]),
    ).toEqual([
      [0n, MAX_LOG_RANGE],
      [MAX_LOG_RANGE + 1n, MAX_LOG_RANGE * 2n + 1n],
      [MAX_LOG_RANGE * 2n + 2n, MAX_LOG_RANGE * 2n + 10n],
    ]);
  });

  it('looks back once, then reads only new blocks', async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => saved.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    const source = reader([log()]);
    const store = createReceivedTransfers(storage, source);
    expect(await store.sync(me)).toHaveLength(1);
    expect(source.transfers.mock.calls[0]![1]).toBe(
      1_000_000n - LOOKBACK_BLOCKS,
    );

    source.head.mockResolvedValue(1_000_050n);
    source.transfers.mockResolvedValue([log({ txHash: tx(2) })]);
    expect(await store.sync(me)).toHaveLength(2);
    expect(source.transfers.mock.calls.at(-1)!.slice(1)).toEqual([
      1_000_001n,
      1_000_050n,
    ]);
  });

  it('lists sent and received together, newest first', () => {
    const items = activityItems(
      [
        {
          id: 'sim-1',
          reference: 'TRV1',
          address: me,
          merchantName: 'Cafe Lotus',
          location: 'Pune',
          inrAmount: '100',
          token: 'pathUSD',
          createdAt: 1_700_000_500_000,
        },
      ],
      [
        {
          id: 'r-1',
          from: friend,
          amountAtomic: '1000000',
          txHash: tx(1),
          createdAt: 1_700_000_000_000,
        },
      ],
    );
    expect(items.map((item) => item.direction)).toEqual(['Sent', 'Received']);
  });
});
