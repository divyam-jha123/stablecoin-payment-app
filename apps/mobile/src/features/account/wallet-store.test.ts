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
    });
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
