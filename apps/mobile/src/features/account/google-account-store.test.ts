import { describe, expect, it } from 'vitest';
import { createGoogleAccountStore } from './google-account-store';

function memory(initial: string | null = null) {
  let value = initial;
  return {
    get: async () => value,
    set: async (next: string) => {
      value = next;
    },
    remove: async () => {
      value = null;
    },
    peek: () => value,
  };
}

const asha = { sub: '123', name: 'Asha Rao', email: 'asha@example.com' };

describe('Google account store', () => {
  it('is unread until loaded, then empty when nothing is saved', async () => {
    const store = createGoogleAccountStore(memory());
    expect(store.snapshot()).toBeUndefined();
    expect(await store.load()).toBeNull();
    expect(store.snapshot()).toBeNull();
  });

  it('saves a valid profile and restores it on the next launch', async () => {
    const storage = memory();
    await createGoogleAccountStore(storage).save(asha);
    expect(await createGoogleAccountStore(storage).load()).toEqual(asha);
  });

  it('rejects malformed profiles instead of saving them', async () => {
    const storage = memory();
    const store = createGoogleAccountStore(storage);
    await expect(
      store.save({ ...asha, email: 'not-an-email' }),
    ).rejects.toThrow();
    await expect(store.save({ ...asha, name: '   ' })).rejects.toThrow();
    expect(storage.peek()).toBeNull();
  });

  it('treats a corrupt saved entry as signed out', async () => {
    expect(await createGoogleAccountStore(memory('{nope')).load()).toBeNull();
    expect(
      await createGoogleAccountStore(memory('{"email":"x"}')).load(),
    ).toBeNull();
  });

  it('clears the profile and tells subscribers', async () => {
    const store = createGoogleAccountStore(memory());
    let calls = 0;
    store.subscribe(() => calls++);
    await store.save(asha);
    await store.clear();
    expect(store.snapshot()).toBeNull();
    expect(calls).toBe(2);
  });
});
