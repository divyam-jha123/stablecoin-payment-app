import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createEVMClient: vi.fn(),
  openURL: vi.fn(),
}));
vi.mock('@metamask/connect-evm', () => ({
  createEVMClient: mocks.createEVMClient,
}));
vi.mock('react-native', () => ({ Linking: { openURL: mocks.openURL } }));

const uri = 'metamask://connect?test-pairing=one';
async function fixture() {
  const handlers = new Map<string, Set<(value: string) => void>>();
  const provider = {
    on(event: string, handler: (value: string) => void) {
      const listeners = handlers.get(event) ?? new Set();
      listeners.add(handler);
      handlers.set(event, listeners);
    },
    removeListener(event: string, handler: (value: string) => void) {
      handlers.get(event)?.delete(handler);
    },
  };
  const emit = (value = uri) =>
    handlers.get('display_uri')?.forEach((handler) => handler(value));
  const sdk = {
    getProvider: () => provider,
    connect: vi.fn(async () => {
      emit();
    }),
    switchChain: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    getAccount: () => undefined,
    getChainId: () => undefined,
  };
  mocks.createEVMClient.mockResolvedValue(sdk);
  const { walletStore } = await import('./metamask');
  return { walletStore, sdk, emit, handlers };
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.openURL.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MetaMask native connection wiring', () => {
  it('removes the pairing listener on timeout and ignores subsequent events', async () => {
    const { walletStore, sdk, emit, handlers } = await fixture();
    vi.useFakeTimers();
    sdk.connect.mockImplementation(() => new Promise<void>(() => {}));
    const pending = walletStore.connect();
    await vi.advanceTimersByTimeAsync(90_000);
    await pending;
    emit();
    expect(mocks.openURL).not.toHaveBeenCalled();
    expect(handlers.get('display_uri')?.size).toBe(0);
    expect(walletStore.getSnapshot().error).toMatch(/did not respond/);
  });

  it('opens the headless pairing event emitted during connect and cleans up', async () => {
    const { walletStore, sdk, handlers } = await fixture();
    await walletStore.connect();
    expect(mocks.openURL).toHaveBeenCalledExactlyOnceWith(uri);
    expect(sdk.switchChain).toHaveBeenCalledOnce();
    expect(handlers.get('display_uri')?.size).toBe(0);
  });

  it('does not open a duplicate event twice or accumulate listeners on retry', async () => {
    const { walletStore, sdk, emit, handlers } = await fixture();
    sdk.connect.mockImplementation(async () => {
      emit();
      emit();
    });
    await walletStore.connect();
    await walletStore.connect();
    expect(mocks.openURL).toHaveBeenCalledTimes(2);
    expect(handlers.get('display_uri')?.size).toBe(0);
  });

  it('reports an OS link-opening failure and removes the listener while SDK connect is pending', async () => {
    const { walletStore, sdk, emit, handlers } = await fixture();
    mocks.openURL.mockRejectedValue(new Error('No activity found'));
    sdk.connect.mockImplementation(() => {
      emit();
      return new Promise<void>(() => {});
    });
    await walletStore.connect();
    expect(walletStore.getSnapshot().error).toMatch(/Could not open MetaMask/);
    expect(walletStore.getSnapshot().busy).toBe(false);
    expect(sdk.switchChain).not.toHaveBeenCalled();
    expect(handlers.get('display_uri')?.size).toBe(0);
  });

  it('ignores pairing events after cancellation', async () => {
    const { walletStore, sdk, emit } = await fixture();
    let finish!: () => void;
    sdk.connect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = walletStore.connect();
    await vi.waitFor(() => expect(sdk.connect).toHaveBeenCalledOnce());
    await walletStore.disconnect();
    emit();
    expect(mocks.openURL).not.toHaveBeenCalled();
    finish();
    await pending;
  });
});
