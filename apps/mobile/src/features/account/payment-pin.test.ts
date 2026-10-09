import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));

const { createPinStore, isValidPin, LOCKOUT_MS, MAX_ATTEMPTS } =
  await import('./payment-pin');

const owner = '0x1234567890ABCDEF1234567890abcdef12345678';

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

describe('payment PIN', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('0420')).toBe(true);
    expect(isValidPin('420')).toBe(false);
    expect(isValidPin('04200')).toBe(false);
    expect(isValidPin('04a0')).toBe(false);
  });

  it('stores only a salted hash and verifies the right PIN', async () => {
    const storage = memoryStorage();
    const store = createPinStore(storage);
    expect(await store.hasPin(owner)).toBe(false);
    await store.setPin(owner, '0420');
    expect(await store.hasPin(owner.toLowerCase())).toBe(true);
    const saved = [...storage.items.values()].join('');
    expect(saved).not.toContain('0420');
    expect(await store.verify(owner, '0420')).toEqual({ ok: true });
    expect(await store.verify(owner, '1111')).toEqual({
      ok: false,
      attemptsLeft: MAX_ATTEMPTS - 1,
    });
    await expect(store.setPin(owner, '12')).rejects.toThrow();
  });

  it('moves an older per-wallet PIN to the phone without overwriting one', async () => {
    const store = createPinStore(memoryStorage());
    await store.setPin(owner, '1234');
    await store.adopt(owner, 'device');
    expect((await store.verify('device', '1234')).ok).toBe(true);
    await store.setPin('device', '9999');
    await store.adopt(owner, 'device');
    expect((await store.verify('device', '9999')).ok).toBe(true);
  });

  it('pauses entry after five wrong tries, then recovers', async () => {
    const store = createPinStore(memoryStorage());
    await store.setPin(owner, '0420');
    const now = 1_000_000;
    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
      expect(await store.verify(owner, '9999', now)).toMatchObject({
        ok: false,
      });
    }
    expect(await store.verify(owner, '9999', now)).toEqual({
      ok: false,
      lockedUntil: now + LOCKOUT_MS,
    });
    // Even the right PIN waits out the pause.
    expect(await store.verify(owner, '0420', now + 1_000)).toEqual({
      ok: false,
      lockedUntil: now + LOCKOUT_MS,
    });
    expect(await store.verify(owner, '0420', now + LOCKOUT_MS)).toEqual({
      ok: true,
    });
  });

  it('a correct PIN resets the wrong-try count', async () => {
    const store = createPinStore(memoryStorage());
    await store.setPin(owner, '0420');
    await store.verify(owner, '1111');
    await store.verify(owner, '0420');
    expect(await store.verify(owner, '1111')).toEqual({
      ok: false,
      attemptsLeft: MAX_ATTEMPTS - 1,
    });
  });

  it('clears the PIN', async () => {
    const store = createPinStore(memoryStorage());
    await store.setPin(owner, '0420');
    await store.clear(owner);
    expect(await store.hasPin(owner)).toBe(false);
  });
});
