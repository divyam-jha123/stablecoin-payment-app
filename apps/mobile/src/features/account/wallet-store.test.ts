import { describe, expect, it, vi } from 'vitest';
import {
  createWalletStore,
  type WalletAccount,
  type WalletAdapter,
} from './wallet-store';

const address = '0x1234567890123456789012345678901234567890';
function fixture() {
  let account: WalletAccount | null = null;
  let changed = () => {};
  const adapter: WalletAdapter = {
    connect: vi.fn(async () => {
      account = { address, chainId: 1 };
    }),
    switchToTempo: vi.fn(async () => {
      account = { address, chainId: 42431 };
    }),
    disconnect: vi.fn(async () => {
      account = null;
    }),
    account: vi.fn(async () => account),
    signMessage: vi.fn(async () => '0xsignature' as `0x${string}`),
    sendTransaction: vi.fn(async () => '0xhash' as `0x${string}`),
    subscribe: (listener) => {
      changed = listener;
      return () => {
        changed = () => {};
      };
    },
  };
  return {
    adapter,
    store: createWalletStore(adapter),
    change(value: WalletAccount | null) {
      account = value;
      changed();
    },
  };
}

describe('MetaMask account lifecycle', () => {
  it('connects and switches to Tempo', async () => {
    const { store, adapter } = fixture();
    await store.connect();
    expect(adapter.switchToTempo).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toEqual({
      account: { address, chainId: 42431 },
      busy: false,
      error: null,
      restored: true,
    });
  });
  it('falls back to the remembered traveller when MetaMask has no session', async () => {
    const { adapter } = fixture();
    const store = createWalletStore(adapter, { load: async () => address });
    expect(store.getSnapshot().restored).toBe(false);
    await store.refresh();
    expect(store.getSnapshot()).toMatchObject({
      account: { address, chainId: 42431 },
      restored: true,
    });
  });
  it('opens the remembered account while MetaMask is still restoring', async () => {
    const { adapter } = fixture();
    let finish!: (account: WalletAccount | null) => void;
    vi.mocked(adapter.account).mockImplementationOnce(
      () =>
        new Promise<WalletAccount | null>((resolve) => {
          finish = resolve;
        }),
    );
    const store = createWalletStore(adapter, { load: async () => address });
    const pending = store.refresh();
    await vi.waitFor(() => expect(adapter.account).toHaveBeenCalledOnce());
    expect(store.getSnapshot()).toMatchObject({
      account: { address, chainId: 42431 },
      restored: true,
    });
    finish(null);
    await pending;
  });
  it('primes Home from the remembered account before SDK restoration', async () => {
    const { adapter } = fixture();
    const store = createWalletStore(adapter, { load: async () => address });
    await store.restoreRemembered();
    expect(adapter.account).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      account: { address, chainId: 42431 },
      restored: true,
    });
  });
  it('does not replace a different live wallet while priming Home', async () => {
    const { adapter } = fixture();
    const live = '0x9999999999999999999999999999999999999999';
    vi.mocked(adapter.account).mockResolvedValue({ address: live, chainId: 1 });
    const store = createWalletStore(adapter, { load: async () => address });
    await store.refresh();
    await store.restoreRemembered();
    expect(store.getSnapshot().account).toEqual({ address: live, chainId: 1 });
  });
  it('prefers the live MetaMask account over the remembered one', async () => {
    const { adapter } = fixture();
    const live = '0x9999999999999999999999999999999999999999';
    vi.mocked(adapter.account).mockResolvedValue({ address: live, chainId: 1 });
    const store = createWalletStore(adapter, { load: async () => address });
    await store.refresh();
    expect(store.getSnapshot().account).toEqual({ address: live, chainId: 1 });
  });
  it('reports rejected approvals without inventing an account', async () => {
    const { store, adapter } = fixture();
    vi.mocked(adapter.connect).mockRejectedValue({ code: 4001 });
    await store.connect();
    expect(store.getSnapshot().account).toBeNull();
    expect(store.getSnapshot().error).toMatch(/declined/);
    expect(store.getSnapshot().busy).toBe(false);
  });
  it('keeps the actual network after a rejected switch', async () => {
    const { store, adapter } = fixture();
    vi.mocked(adapter.switchToTempo).mockRejectedValue({ code: 4001 });
    await store.connect();
    expect(store.getSnapshot().account?.chainId).toBe(1);
  });
  it('does not assume a successful switch changed the network', async () => {
    const { store, adapter } = fixture();
    vi.mocked(adapter.switchToTempo).mockResolvedValue();
    await store.connect();
    expect(store.getSnapshot().error).toMatch(/Select Tempo/);
  });
  it('updates account/network changes and wallet disconnect events', async () => {
    const f = fixture();
    const stop = f.store.start();
    await f.store.connect();
    f.change({
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      chainId: 1,
    });
    await vi.waitFor(() =>
      expect(f.store.getSnapshot().account?.chainId).toBe(1),
    );
    f.change(null);
    await vi.waitFor(() => expect(f.store.getSnapshot().account).toBeNull());
    stop();
  });
  it('shares one adapter subscription across mounted account screens', () => {
    const { adapter, store } = fixture();
    const subscribe = vi.spyOn(adapter, 'subscribe');
    const first = store.start();
    const second = store.start();
    expect(subscribe).toHaveBeenCalledOnce();
    first();
    second();
  });
  it('suppresses late approvals after cancel, and allows a fresh connection', async () => {
    const f = fixture();
    const stop = f.store.start();
    let finish!: () => void;
    vi.mocked(f.adapter.connect).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = f.store.connect();
    await f.store.disconnect();
    f.change({ address, chainId: 42431 });
    finish();
    await pending;
    expect(f.adapter.switchToTempo).not.toHaveBeenCalled();
    expect(f.store.getSnapshot().account).toBeNull();
    await f.store.connect();
    expect(f.store.getSnapshot().account?.chainId).toBe(42431);
    stop();
  });
  it('does not launch duplicate connections', async () => {
    const { store, adapter } = fixture();
    await Promise.all([store.connect(), store.connect()]);
    expect(adapter.connect).toHaveBeenCalledOnce();
  });
  it('rejects invalid wallet addresses', async () => {
    const { store, adapter } = fixture();
    vi.mocked(adapter.account).mockResolvedValue({
      address: 'not-an-address',
      chainId: 42431,
    });
    await store.refresh();
    expect(store.getSnapshot().account).toBeNull();
    expect(store.getSnapshot().error).toMatch(/invalid account/);
  });
});
