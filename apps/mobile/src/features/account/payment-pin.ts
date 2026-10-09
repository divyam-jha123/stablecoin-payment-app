import * as SecureStore from 'expo-secure-store';
import {
  bytesToHex,
  concat,
  hexToBytes,
  sha256,
  stringToBytes,
  type Hex,
} from 'viem';
import type { KeyStorage } from './payment-key';

/**
 * The 4-digit TravelPe PIN that approves each payment. Only a salted,
 * stretched hash is kept, in the phone's secure storage; the digits never
 * leave this device. Five wrong tries pause PIN entry for five minutes.
 */

export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 5 * 60_000;
const HASH_ROUNDS = 2_000;

type StoredPin = {
  salt: Hex;
  hash: Hex;
  failed: number;
  lockedUntil: number;
};

export type PinCheck =
  | { ok: true }
  | { ok: false; attemptsLeft: number }
  | { ok: false; lockedUntil: number };

function item(owner: string) {
  return `traveller.payment-pin.v1.${owner.toLowerCase()}`;
}

export function isValidPin(pin: string) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

function hashPin(pin: string, salt: Hex): Hex {
  const saltBytes = hexToBytes(salt);
  let digest = sha256(concat([saltBytes, stringToBytes(pin)]), 'bytes');
  for (let round = 1; round < HASH_ROUNDS; round++) {
    digest = sha256(concat([saltBytes, digest]), 'bytes');
  }
  return bytesToHex(digest);
}

/** Constant-time comparison of two equal-length hex strings. */
function sameHash(a: Hex, b: Hex) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export function createPinStore(storage: KeyStorage = SecureStore) {
  async function read(owner: string): Promise<StoredPin | null> {
    const raw = await storage.getItemAsync(item(owner));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredPin;
    } catch {
      return null;
    }
  }
  async function write(owner: string, pin: StoredPin) {
    await storage.setItemAsync(item(owner), JSON.stringify(pin));
  }

  return {
    async hasPin(owner: string) {
      return (await read(owner)) !== null;
    },
    async setPin(owner: string, pin: string) {
      if (!isValidPin(pin)) throw new Error('Enter 4 digits.');
      const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      await write(owner, {
        salt,
        hash: hashPin(pin, salt),
        failed: 0,
        lockedUntil: 0,
      });
    },
    async verify(
      owner: string,
      pin: string,
      now = Date.now(),
    ): Promise<PinCheck> {
      const stored = await read(owner);
      if (!stored) return { ok: false, attemptsLeft: 0 };
      if (stored.lockedUntil > now)
        return { ok: false, lockedUntil: stored.lockedUntil };
      if (isValidPin(pin) && sameHash(hashPin(pin, stored.salt), stored.hash)) {
        if (stored.failed || stored.lockedUntil)
          await write(owner, { ...stored, failed: 0, lockedUntil: 0 });
        return { ok: true };
      }
      const failed = stored.failed + 1;
      if (failed >= MAX_ATTEMPTS) {
        const lockedUntil = now + LOCKOUT_MS;
        await write(owner, { ...stored, failed: 0, lockedUntil });
        return { ok: false, lockedUntil };
      }
      await write(owner, { ...stored, failed, lockedUntil: 0 });
      return { ok: false, attemptsLeft: MAX_ATTEMPTS - failed };
    },
    /**
     * Older builds kept the PIN per wallet address. Move it to `to` so the
     * traveller keeps the PIN they already set; never overwrites a PIN.
     */
    async adopt(from: string, to: string) {
      if (from.toLowerCase() === to.toLowerCase()) return;
      if (await storage.getItemAsync(item(to))) return;
      const raw = await storage.getItemAsync(item(from));
      if (raw) await storage.setItemAsync(item(to), raw);
    },
    async clear(owner: string) {
      await storage.deleteItemAsync(item(owner));
    },
  };
}

export const pinStore = createPinStore();

/** The UI preview has no wallet; its PIN is kept under this name. */
export const PREVIEW_PIN_OWNER = 'preview';

/**
 * The PIN belongs to this phone, not to a wallet: it is set once at
 * onboarding, before the traveller signs in with Google or MetaMask.
 */
export const DEVICE_PIN_OWNER = 'device';
