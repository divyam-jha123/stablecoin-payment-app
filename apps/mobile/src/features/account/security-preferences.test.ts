import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));

const {
  createSecurityPreferences,
  DEFAULT_SECURITY_PREFERENCES,
  parseSecurityPreferences,
  SECURITY_PREFERENCES_KEY,
  unlockMethod,
} = await import('./security-preferences');

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

describe('security preferences', () => {
  it('keeps App Lock and biometrics on by default', async () => {
    const store = createSecurityPreferences(memoryStorage());
    expect(await store.load()).toEqual({ appLock: true, biometrics: true });
  });

  it('saves each change without dropping the other setting', async () => {
    const storage = memoryStorage();
    const store = createSecurityPreferences(storage);
    await store.update({ biometrics: false });
    expect(await store.update({ appLock: false })).toEqual({
      appLock: false,
      biometrics: false,
    });
    await store.update({ appLock: true });
    expect(await store.load()).toEqual({ appLock: true, biometrics: false });
    expect(storage.items.has(SECURITY_PREFERENCES_KEY)).toBe(true);
  });

  it('keeps the lock on when stored data is corrupt or partial', () => {
    expect(parseSecurityPreferences('not json')).toEqual(
      DEFAULT_SECURITY_PREFERENCES,
    );
    expect(parseSecurityPreferences('{"appLock":"no"}')).toEqual({
      appLock: true,
      biometrics: true,
    });
    expect(parseSecurityPreferences('{"biometrics":false}')).toEqual({
      appLock: true,
      biometrics: false,
    });
  });
});

describe('unlock method', () => {
  it('skips the lock only when App Lock is off', () => {
    expect(unlockMethod({ appLock: false, biometrics: true }, true)).toBe(
      'none',
    );
    expect(unlockMethod({ appLock: false, biometrics: false }, true)).toBe(
      'none',
    );
  });

  it('uses the phone prompt while biometrics are on', () => {
    expect(unlockMethod({ appLock: true, biometrics: true }, true)).toBe(
      'device',
    );
  });

  it('uses the TravelPe PIN with biometrics off, if one is set', () => {
    expect(unlockMethod({ appLock: true, biometrics: false }, true)).toBe(
      'pin',
    );
    expect(unlockMethod({ appLock: true, biometrics: false }, false)).toBe(
      'device',
    );
  });
});
