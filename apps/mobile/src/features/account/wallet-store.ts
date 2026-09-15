import { accountAddress, TEMPO_CHAIN } from './tempo';

export type WalletAccount = { address: string; chainId: number };
export type WalletSnapshot = {
  account: WalletAccount | null;
  busy: boolean;
  error: string | null;
};
export interface WalletAdapter {
  connect(): Promise<void>;
  switchToTempo(): Promise<void>;
  disconnect(): Promise<void>;
  account(): Promise<WalletAccount | null>;
  subscribe(listener: () => void): () => void;
}

export function walletError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : null;
  if (code === 4001) return 'Request declined in MetaMask. You can try again.';
  if (code === -32002)
    return 'A request is already waiting in MetaMask. Open MetaMask to finish it.';
  return error instanceof Error
    ? error.message
    : 'Could not reach MetaMask. Open the wallet and try again.';
}

export function createWalletStore(adapter: WalletAdapter) {
  let snapshot: WalletSnapshot = { account: null, busy: false, error: null };
  let operation = 0;
  let read = 0;
  let disconnected = false;
  let disconnecting = false;
  const listeners = new Set<() => void>();
  function update(patch: Partial<WalletSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }
  async function refresh() {
    if (disconnected) return;
    const version = ++read;
    try {
      const account = await adapter.account();
      if (account) accountAddress(account.address);
      if (version === read) update({ account });
    } catch (error) {
      if (version === read)
        update({ account: null, error: walletError(error) });
    }
  }
  async function run(action: () => Promise<void>) {
    if (snapshot.busy) return;
    const version = ++operation;
    update({ busy: true, error: null });
    try {
      await action();
      if (version !== operation) return;
      await refresh();
      if (
        version === operation &&
        snapshot.account?.chainId !== TEMPO_CHAIN.id
      ) {
        update({
          error: 'Select Tempo Moderato testnet in MetaMask to continue.',
        });
      }
    } catch (error) {
      if (version === operation) {
        await refresh();
        if (version === operation) update({ error: walletError(error) });
      }
    } finally {
      if (version === operation) update({ busy: false });
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      const unsubscribe = adapter.subscribe(() => {
        void refresh();
      });
      void refresh();
      return unsubscribe;
    },
    refresh,
    connect: () =>
      run(async () => {
        disconnected = false;
        const version = operation;
        await adapter.connect();
        if (version === operation) await adapter.switchToTempo();
      }),
    switchToTempo: () => run(() => adapter.switchToTempo()),
    async disconnect() {
      if (disconnecting) return;
      disconnecting = true;
      disconnected = true;
      ++operation;
      ++read;
      update({ account: null, busy: true, error: null });
      try {
        await adapter.disconnect();
      } catch (error) {
        update({ error: walletError(error) });
      } finally {
        ++read;
        disconnecting = false;
        update({ account: null, busy: false });
      }
    },
  };
}
