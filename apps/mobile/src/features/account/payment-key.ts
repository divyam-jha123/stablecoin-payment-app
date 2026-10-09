import * as SecureStore from 'expo-secure-store';
import {
  createWalletClient,
  encodeFunctionData,
  http,
  isAddress,
  padHex,
  stringToHex,
  toFunctionSelector,
  type Address,
  type Hex,
  type PublicClient,
  type Transport,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { Abis, Account, Actions } from 'viem/tempo';
import { PATH_USD, publicClient, TEMPO_CHAIN } from './tempo';

/**
 * Tap to pay: one MetaMask approval authorises a payment key that lives only
 * on this phone. Tempo's AccountKeychain then lets that key pay from the
 * traveller's own account, enforced on-chain: a daily limit, an end date, and
 * only TravelPe's settlement account as recipient. Funds never leave the
 * MetaMask account until a payment is made.
 */

export const ACCOUNT_KEYCHAIN = '0xaAAAaaAA00000000000000000000000000000000';
export const DAILY_LIMIT_OPTIONS_USD = [100, 250, 500] as const;
export const TRIP_LENGTH_OPTIONS_DAYS = [7, 14, 30] as const;
const DAY_SECONDS = 86_400;
const PATH_USD_SCALE = 1_000_000n;
// Network fees are paid from the same account and count against the daily
// limit, so a payment needs this much room on top of its amount.
export const FEE_HEADROOM_ATOMIC = 10_000n;
const SECP256K1_KEY_TYPE = 0;
const TRANSFER = toFunctionSelector('transfer(address,uint256)');
const TRANSFER_WITH_MEMO = toFunctionSelector(
  'transferWithMemo(address,uint256,bytes32)',
);

export type StoredPaymentKey = {
  owner: string;
  privateKey: Hex;
  dailyLimitUsd: number;
  expiry: number;
};

export type PaymentKeyStatus =
  | { state: 'none' }
  | { state: 'expired' | 'revoked'; key: StoredPaymentKey }
  | {
      state: 'active';
      key: StoredPaymentKey;
      remainingAtomic: bigint;
      periodEnd: number;
    };

export interface KeyStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

type TempoClient = PublicClient<Transport, typeof TEMPO_CHAIN>;

function keyItem(owner: string) {
  return `traveller.payment-key.v1.${owner.toLowerCase()}`;
}
function deferredItem(owner: string) {
  return `traveller.payment-key-deferred.v1.${owner.toLowerCase()}`;
}

/** TravelPe's settlement account on Tempo, which pays merchants in INR. */
export function settlementAddress(
  value = process.env.EXPO_PUBLIC_SETTLEMENT_ADDRESS,
): Address | null {
  const trimmed = value?.trim();
  return trimmed && isAddress(trimmed) ? trimmed : null;
}

export function usdToAtomic(usd: number) {
  return BigInt(usd) * PATH_USD_SCALE;
}

export function keyAddress(privateKey: Hex): Address {
  return privateKeyToAccount(privateKey).address;
}

export function newPaymentKey(input: {
  owner: string;
  dailyLimitUsd: number;
  tripDays: number;
  now?: number;
}): StoredPaymentKey {
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  return {
    owner: input.owner.toLowerCase(),
    privateKey: generatePrivateKey(),
    dailyLimitUsd: input.dailyLimitUsd,
    expiry: now + input.tripDays * DAY_SECONDS,
  };
}

/** The single MetaMask transaction that turns tap to pay on. */
export function authorizeKeyCall(key: StoredPaymentKey, settlement: Address) {
  const recipients = [settlement];
  return {
    to: ACCOUNT_KEYCHAIN as Address,
    data: encodeFunctionData({
      abi: Abis.accountKeychain,
      functionName: 'authorizeKey',
      args: [
        keyAddress(key.privateKey),
        SECP256K1_KEY_TYPE,
        {
          expiry: BigInt(key.expiry),
          enforceLimits: true,
          limits: [
            {
              token: PATH_USD,
              amount: usdToAtomic(key.dailyLimitUsd),
              period: BigInt(DAY_SECONDS),
            },
          ],
          allowAnyCalls: false,
          allowedCalls: [
            {
              target: PATH_USD,
              selectorRules: [
                { selector: TRANSFER, recipients },
                { selector: TRANSFER_WITH_MEMO, recipients },
              ],
            },
          ],
        },
      ],
    }),
  };
}

/** The MetaMask transaction that turns tap to pay off for this key. */
export function revokeKeyCall(key: StoredPaymentKey) {
  return {
    to: ACCOUNT_KEYCHAIN as Address,
    data: encodeFunctionData({
      abi: Abis.accountKeychain,
      functionName: 'revokeKey',
      args: [keyAddress(key.privateKey)],
    }),
  };
}

/** Payment reference carried on-chain with the transfer. */
export function paymentMemo(reference: string): Hex {
  if (new TextEncoder().encode(reference).length > 32) {
    throw new Error('Payment reference is too long.');
  }
  return padHex(stringToHex(reference), { dir: 'right', size: 32 });
}

/** A transfer the traveller signs in MetaMask, when tap to pay can't cover it. */
export function transferCall(input: {
  settlement: Address;
  amountAtomic: bigint;
  reference: string;
}) {
  return {
    to: PATH_USD as Address,
    data: encodeFunctionData({
      abi: Abis.tip20,
      functionName: 'transferWithMemo',
      args: [
        input.settlement,
        input.amountAtomic,
        paymentMemo(input.reference),
      ],
    }),
  };
}

type KeychainReader = Pick<
  typeof Actions.accessKey,
  'getMetadata' | 'getRemainingLimit'
>;

export function createPaymentKeyStore(
  storage: KeyStorage = SecureStore,
  client: TempoClient = publicClient,
  keychain: KeychainReader = Actions.accessKey,
) {
  async function load(owner: string) {
    const raw = await storage.getItemAsync(keyItem(owner));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredPaymentKey;
      return parsed.owner === owner.toLowerCase() &&
        /^0x[0-9a-f]{64}$/i.test(parsed.privateKey)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  return {
    load,
    async save(key: StoredPaymentKey) {
      await storage.setItemAsync(keyItem(key.owner), JSON.stringify(key));
      await storage.deleteItemAsync(deferredItem(key.owner));
    },
    async remove(owner: string) {
      await storage.deleteItemAsync(keyItem(owner));
    },
    /** "Not now" on set-up: don't offer it again after every sign-in. */
    async defer(owner: string) {
      await storage.setItemAsync(deferredItem(owner), '1');
    },
    async shouldOfferSetup(owner: string) {
      if (await load(owner)) return false;
      return (await storage.getItemAsync(deferredItem(owner))) !== '1';
    },
    /** Local key plus its on-chain state, which is the source of truth. */
    async status(owner: string, now = Date.now()): Promise<PaymentKeyStatus> {
      const key = await load(owner);
      if (!key) return { state: 'none' };
      const accessKey = keyAddress(key.privateKey);
      const metadata = await keychain.getMetadata(client, {
        account: owner as Address,
        accessKey,
      });
      if (metadata.isRevoked) return { state: 'revoked', key };
      if (Number(metadata.expiry) * 1000 <= now)
        return { state: 'expired', key };
      const limit = await keychain.getRemainingLimit(client, {
        account: owner as Address,
        accessKey,
        token: PATH_USD,
      });
      return {
        state: 'active',
        key,
        remainingAtomic: limit.remaining,
        periodEnd: Number(limit.periodEnd ?? 0),
      };
    },
    /**
     * Pays the settlement account from the traveller's account with the
     * on-device key; no MetaMask. Resolves once Tempo includes it.
     */
    async pay(input: {
      key: StoredPaymentKey;
      settlement: Address;
      amountAtomic: bigint;
      reference: string;
    }): Promise<Hex> {
      const account = Account.fromSecp256k1(input.key.privateKey, {
        access: input.key.owner as Address,
      });
      const wallet = createWalletClient({
        account,
        chain: TEMPO_CHAIN.extend({ feeToken: PATH_USD }),
        transport: http(TEMPO_CHAIN.rpcUrls.default.http[0], {
          timeout: 20_000,
        }),
      });
      const hash = await wallet.writeContract({
        address: PATH_USD,
        abi: Abis.tip20,
        functionName: 'transferWithMemo',
        args: [
          input.settlement,
          input.amountAtomic,
          paymentMemo(input.reference),
        ],
      });
      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });
      if (receipt.status !== 'success') {
        throw new Error('Tempo rejected the payment. No funds were moved.');
      }
      return hash;
    },
  };
}

export const paymentKeyStore = createPaymentKeyStore();

/** Whether tap to pay can cover this amount without MetaMask. */
export function keyCovers(
  status: PaymentKeyStatus,
  amountAtomic: bigint,
): status is Extract<PaymentKeyStatus, { state: 'active' }> {
  return (
    status.state === 'active' &&
    status.remainingAtomic >= amountAtomic + FEE_HEADROOM_ATOMIC
  );
}
