import * as SecureStore from 'expo-secure-store';
import { isAddress } from 'viem';

/**
 * The traveller who last signed in on this phone. Lets the app open straight
 * to Home on the next launch, behind the app lock, even when MetaMask's own
 * session has lapsed: balances, history and tap to pay only need the address.
 */

export interface AccountMemory {
  load(): Promise<string | null>;
}

const ITEM = 'traveller.remembered-account.v1';
let cached: string | null | undefined;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const rememberedAccount = {
  async load() {
    if (cached === undefined) {
      const saved = await SecureStore.getItemAsync(ITEM).catch(() => null);
      cached = saved && isAddress(saved) ? saved : null;
    }
    return cached;
  },
  async remember(address: string) {
    await SecureStore.setItemAsync(ITEM, address);
    cached = address;
    notify();
  },
  async forget() {
    await SecureStore.deleteItemAsync(ITEM);
    cached = null;
    notify();
  },
  /** The remembered address, or null when unknown or not loaded yet. */
  current: () => cached ?? null,
  /** Whether someone is signed in on this phone (known once loaded). */
  signedIn: () => Boolean(cached),
  /** Whether this address is the traveller signed in on this phone. */
  is: (address: string | undefined) =>
    Boolean(
      cached && address && cached.toLowerCase() === address.toLowerCase(),
    ),
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
} satisfies AccountMemory & Record<string, unknown>;
