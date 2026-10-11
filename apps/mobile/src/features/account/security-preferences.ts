import * as SecureStore from 'expo-secure-store';
import type { KeyStorage } from './payment-key';

/**
 * The traveller's App Lock and biometrics choices, kept in the phone's secure
 * storage so another app can't switch the lock off. Both start on.
 */
export type SecurityPreferences = {
  /** Ask to unlock when TravelPe opens or returns from the background. */
  appLock: boolean;
  /** Unlock with fingerprint or face; off unlocks with the TravelPe PIN. */
  biometrics: boolean;
};

export const DEFAULT_SECURITY_PREFERENCES: SecurityPreferences = {
  appLock: true,
  biometrics: true,
};

export const SECURITY_PREFERENCES_KEY = 'traveller.security-preferences.v1';

/** Unreadable or partial data keeps the lock on rather than failing open. */
export function parseSecurityPreferences(
  raw: string | null,
): SecurityPreferences {
  if (!raw) return DEFAULT_SECURITY_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      appLock: value.appLock !== false,
      biometrics: value.biometrics !== false,
    };
  } catch {
    return DEFAULT_SECURITY_PREFERENCES;
  }
}

export function createSecurityPreferences(storage: KeyStorage = SecureStore) {
  return {
    async load() {
      return parseSecurityPreferences(
        await storage.getItemAsync(SECURITY_PREFERENCES_KEY),
      );
    },
    async update(change: Partial<SecurityPreferences>) {
      const next = { ...(await this.load()), ...change };
      await storage.setItemAsync(
        SECURITY_PREFERENCES_KEY,
        JSON.stringify(next),
      );
      return next;
    },
  };
}

export const securityPreferences = createSecurityPreferences();

export type UnlockMethod = 'none' | 'device' | 'pin';

/**
 * How App Lock asks to unlock. With biometrics off, the TravelPe PIN replaces
 * fingerprint or face; without a PIN the phone's own prompt is the only lock.
 */
export function unlockMethod(
  preferences: SecurityPreferences,
  hasPin: boolean,
): UnlockMethod {
  if (!preferences.appLock) return 'none';
  if (!preferences.biometrics && hasPin) return 'pin';
  return 'device';
}
