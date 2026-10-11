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
vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    constants: { Brand: 'google', Model: 'Pixel 8', Release: '15' },
  },
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

describe('authorized devices', () => {
  it('needs a backend session to list devices', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { listAuthorizedDevices } = await import('./session');
    expect(await listAuthorizedDevices()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists devices with the saved session and treats 401 as signed out', async () => {
    storage.token = 'saved-token';
    const device = {
      id: 'abc',
      device: 'Pixel 8',
      signedInAt: 1,
      lastSeenAt: 2,
      current: true,
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(200, { data: [device] }))
      .mockResolvedValueOnce(response(401, { error: { message: 'No' } }));
    const { listAuthorizedDevices } = await import('./session');

    expect(await listAuthorizedDevices()).toEqual([device]);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer saved-token',
    });
    expect(await listAuthorizedDevices()).toBeNull();
  });

  it('removes a device by id and reports backend errors', async () => {
    storage.token = 'saved-token';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        response(404, { error: { message: 'This device is not signed in' } }),
      );
    const { removeAuthorizedDevice } = await import('./session');

    await removeAuthorizedDevice('abc');
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(
      /\/v1\/auth\/devices\/revoke$/,
    );
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe('{"id":"abc"}');
    await expect(removeAuthorizedDevice('abc')).rejects.toThrow(
      'This device is not signed in',
    );
  });

  it("sends this phone's name when signing in", async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response(200, {
        data: {
          token: 'new',
          address: account.address,
          expiresAt: Date.now() + 60_000,
        },
      }),
    );
    const { verifySignInChallenge } = await import('./session');
    await verifySignInChallenge(
      account,
      { nonce: 'n', message: 'm', expiresAt: Date.now() + 60_000 },
      '0xabc',
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({ device: 'Google Pixel 8' });
  });
});
