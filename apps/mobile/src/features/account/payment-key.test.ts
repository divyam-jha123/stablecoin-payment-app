import {
  decodeFunctionData,
  getAddress,
  hexToString,
  trim,
  type Address,
} from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { Abis } from 'viem/tempo';

vi.mock('expo-secure-store', () => ({}));

const {
  ACCOUNT_KEYCHAIN,
  authorizeKeyCall,
  createPaymentKeyStore,
  keyAddress,
  keyCovers,
  newPaymentKey,
  paymentMemo,
  revokeKeyCall,
  settlementAddress,
  transferCall,
} = await import('./payment-key');
const { PATH_USD } = await import('./tempo');

const owner = '0x1234567890ABCDEF1234567890abcdef12345678';
const settlement = getAddress('0x00000000000000000000000000000000000000aa');
const now = Date.UTC(2026, 9, 9);

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      items.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      items.delete(key);
    },
  };
}

function keychain(metadata: { isRevoked: boolean; expiry: bigint }) {
  return {
    getMetadata: vi.fn(async () => metadata),
    getRemainingLimit: vi.fn(async () => ({
      remaining: 240_000_000n,
      periodEnd: 1_800_000_000n,
    })),
  } as never;
}

describe('tap to pay key', () => {
  it('authorises only the settlement account, with a daily limit and end date', () => {
    const key = newPaymentKey({ owner, dailyLimitUsd: 250, tripDays: 14, now });
    expect(key.owner).toBe(owner.toLowerCase());
    expect(key.expiry).toBe(now / 1000 + 14 * 86_400);

    const call = authorizeKeyCall(key, settlement);
    expect(call.to).toBe(ACCOUNT_KEYCHAIN);
    const { functionName, args } = decodeFunctionData({
      abi: Abis.accountKeychain,
      data: call.data,
    });
    expect(functionName).toBe('authorizeKey');
    const [keyId, keyType, config] = args as unknown as [
      Address,
      number,
      {
        expiry: bigint;
        enforceLimits: boolean;
        limits: readonly { token: Address; amount: bigint; period: bigint }[];
        allowAnyCalls: boolean;
        allowedCalls: readonly {
          target: Address;
          selectorRules: readonly { recipients: readonly Address[] }[];
        }[];
      },
    ];
    expect(keyId).toBe(keyAddress(key.privateKey));
    expect(keyType).toBe(0);
    expect(config.expiry).toBe(BigInt(key.expiry));
    expect(config.enforceLimits).toBe(true);
    expect(config.limits).toEqual([
      { token: getAddress(PATH_USD), amount: 250_000_000n, period: 86_400n },
    ]);
    expect(config.allowAnyCalls).toBe(false);
    expect(config.allowedCalls).toHaveLength(1);
    expect(config.allowedCalls[0]!.target).toBe(getAddress(PATH_USD));
    for (const rule of config.allowedCalls[0]!.selectorRules) {
      expect(rule.recipients).toEqual([settlement]);
    }
  });

  it('builds revoke and MetaMask transfer calls', () => {
    const key = newPaymentKey({ owner, dailyLimitUsd: 100, tripDays: 7, now });
    const revoke = decodeFunctionData({
      abi: Abis.accountKeychain,
      data: revokeKeyCall(key).data,
    });
    expect(revoke.functionName).toBe('revokeKey');
    expect(revoke.args).toEqual([keyAddress(key.privateKey)]);

    const transfer = transferCall({
      settlement,
      amountAtomic: 5_783_133n,
      reference: 'TRV000000480001',
    });
    expect(transfer.to).toBe(PATH_USD);
    const decoded = decodeFunctionData({
      abi: Abis.tip20,
      data: transfer.data,
    });
    expect(decoded.functionName).toBe('transferWithMemo');
    expect(decoded.args?.[0]).toBe(settlement);
    expect(decoded.args?.[1]).toBe(5_783_133n);
  });

  it('carries the payment reference as the memo', () => {
    const memo = paymentMemo('TRV000000480001');
    expect(hexToString(trim(memo, { dir: 'right' }))).toBe('TRV000000480001');
    expect(() => paymentMemo('x'.repeat(33))).toThrow();
  });

  it('reads the settlement address from config and rejects bad values', () => {
    expect(settlementAddress(` ${settlement} `)).toBe(settlement);
    expect(settlementAddress('not-an-address')).toBeNull();
    expect(settlementAddress(undefined)).toBeNull();
  });

  it('offers set-up until a key is saved or the traveller defers it', async () => {
    const storage = memoryStorage();
    const store = createPaymentKeyStore(
      storage,
      {} as never,
      keychain({ isRevoked: false, expiry: 0n }),
    );
    expect(await store.shouldOfferSetup(owner)).toBe(true);
    await store.defer(owner);
    expect(await store.shouldOfferSetup(owner)).toBe(false);

    const key = newPaymentKey({ owner, dailyLimitUsd: 100, tripDays: 7, now });
    await store.save(key);
    expect(await store.load(owner.toUpperCase().replace('0X', '0x'))).toEqual(
      key,
    );
    expect(await store.shouldOfferSetup(owner)).toBe(false);
    await store.remove(owner);
    expect(await store.load(owner)).toBeNull();
    expect(await store.shouldOfferSetup(owner)).toBe(true);
  });

  it('reports active, expired and revoked keys from the chain', async () => {
    const storage = memoryStorage();
    const key = newPaymentKey({ owner, dailyLimitUsd: 250, tripDays: 7, now });
    const later = BigInt(Math.floor(now / 1000) + 3600);

    const none = createPaymentKeyStore(
      storage,
      {} as never,
      keychain({ isRevoked: false, expiry: later }),
    );
    expect(await none.status(owner, now)).toEqual({ state: 'none' });
    await none.save(key);

    const active = await none.status(owner, now);
    expect(active).toMatchObject({
      state: 'active',
      remainingAtomic: 240_000_000n,
    });
    expect(keyCovers(active, 100_000_000n)).toBe(true);
    expect(keyCovers(active, 240_000_000n)).toBe(false);

    const expired = createPaymentKeyStore(
      storage,
      {} as never,
      keychain({ isRevoked: false, expiry: BigInt(now / 1000) }),
    );
    expect((await expired.status(owner, now)).state).toBe('expired');

    const revoked = createPaymentKeyStore(
      storage,
      {} as never,
      keychain({ isRevoked: true, expiry: later }),
    );
    const status = await revoked.status(owner, now);
    expect(status.state).toBe('revoked');
    expect(keyCovers(status, 1n)).toBe(false);
  });
});
