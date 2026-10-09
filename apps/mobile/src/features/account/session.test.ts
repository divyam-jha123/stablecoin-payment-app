import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => storage.token),
  setItemAsync: vi.fn(async (_key: string, value: string) => {
    storage.token = value;
  }),
  deleteItemAsync: vi.fn(async () => {
    storage.token = null;
  }),
}));
vi.mock('expo-constants', () => ({
  default: { expoConfig: { hostUri: 'localhost:8081' } },
}));

const account = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: 42431,
};

function response(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  storage.token = null;
});

describe('wallet session restoration', () => {
  it('shares concurrent checks and reuses a recent valid result', async () => {
    storage.token = 'saved-token';
    let finish!: (value: Response) => void;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const { restoreSession } = await import('./session');
    const first = restoreSession(account);
    const second = restoreSession(account);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    finish(
      response(200, {
        data: { address: account.address, expiresAt: Date.now() + 60_000 },
      }),
    );
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(await restoreSession(account)).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps the token after a temporary backend failure', async () => {
    storage.token = 'saved-token';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        response(503, { error: { message: 'Unavailable' } }),
      )
      .mockResolvedValueOnce(
        response(200, {
          data: { address: account.address, expiresAt: Date.now() + 60_000 },
        }),
      );
    const { restoreSession } = await import('./session');
    await expect(restoreSession(account)).rejects.toThrow('Unavailable');
    expect(storage.token).toBe('saved-token');
    expect(await restoreSession(account)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('removes a token only when the backend rejects that session', async () => {
    storage.token = 'expired-token';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response(401, { error: { message: 'Session expired' } }),
    );
    const { restoreSession } = await import('./session');
    expect(await restoreSession(account)).toBe(false);
    expect(storage.token).toBeNull();
  });

  it('does not erase a newer token when an older check returns late', async () => {
    storage.token = 'old-token';
    let finish!: (value: Response) => void;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const { restoreSession } = await import('./session');
    const pending = restoreSession(account);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    storage.token = 'new-token';
    finish(response(401, { error: { message: 'Old session expired' } }));
    expect(await pending).toBe(false);
    expect(storage.token).toBe('new-token');
  });
});
