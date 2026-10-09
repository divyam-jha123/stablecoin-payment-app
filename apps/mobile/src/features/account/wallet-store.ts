import type { AccountMemory } from './remembered-account';
import { accountAddress, TEMPO_CHAIN } from './tempo';
import { walletFlowLog } from './wallet-flow-log';

export type WalletAccount = { address: string; chainId: number };
export type ConnectStage =
  | 'preparing'
  | 'connecting'
  | 'combined'
  | 'network'
  | 'checking-session'
  | 'challenge'
  | 'signing'
  | 'verifying'
  | 'saving';
export type StageListener = (stage: ConnectStage) => void;
export type WalletSnapshot = {
  account: WalletAccount | null;
  busy: boolean;
  error: string | null;
  /** False until the first account check after launch has finished. */
  restored: boolean;
};
export interface WalletAdapter {
  connect(onStage?: StageListener): Promise<void>;
  connectAndSign?(
    message: string,
    onStage?: StageListener,
  ): Promise<{ account: WalletAccount; signature: `0x${string}` }>;
  switchToTempo(onStage?: StageListener): Promise<void>;
  disconnect(): Promise<void>;
  account(): Promise<WalletAccount | null>;
  signMessage(message: string, onStage?: StageListener): Promise<`0x${string}`>;
  /** Sends one transaction from the connected account; resolves its hash. */
  sendTransaction(call: {
    to: `0x${string}`;
    data: `0x${string}`;
  }): Promise<`0x${string}`>;
  subscribe(listener: () => void): () => void;
}

export function walletError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : null;
  if (code === 4001) return 'Request declined in MetaMask. You can try again.';
  if (code === 4100)
    return 'MetaMask has not approved Tempo for Traveller Pay. Approve the connection in MetaMask, then try again.';
  if (code === -32002)
    return 'A request is already waiting in MetaMask. Open MetaMask to finish it.';
  return error instanceof Error
    ? error.message
    : 'Could not reach MetaMask. Open the wallet and try again.';
}

export function createWalletStore(
  adapter: WalletAdapter,
  memory?: AccountMemory,
) {
  let snapshot: WalletSnapshot = {
    account: null,
    busy: false,
    error: null,
    restored: false,
  };
  let operation = 0;
  let read = 0;
  let disconnected = false;
  let disconnecting = false;
  let subscribers = 0;
  let unsubscribeAdapter: (() => void) | undefined;
  const listeners = new Set<() => void>();
  function update(patch: Partial<WalletSnapshot>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }
  async function refresh() {
    if (disconnected) return;
    const version = ++read;
    try {
      // Show the signed-in traveller as soon as secure storage responds.
      // MetaMask can take several seconds to restore its own session.
      const remembered = memory ? await memory.load() : null;
      if (version !== read || disconnected) return;
      if (remembered && !snapshot.account) {
        const account = { address: remembered, chainId: TEMPO_CHAIN.id };
        accountAddress(account.address);
        update({ account, restored: true });
      }
      // A live MetaMask account takes precedence once its session is ready.
      let account = await adapter.account();
      if (!account && remembered) {
        account = { address: remembered, chainId: TEMPO_CHAIN.id };
      }
      if (account) accountAddress(account.address);
      if (version === read && !disconnected)
        update({ account, restored: true });
    } catch (error) {
      if (version === read && !disconnected)
        update({
          account: memory ? snapshot.account : null,
          error: walletError(error),
          restored: true,
        });
    }
  }
  async function restoreRemembered() {
    if (!memory || disconnected) return;
    const version = ++read;
    const remembered = await memory.load();
    if (version !== read || disconnected || !remembered) return;
    if (snapshot.account) return;
    accountAddress(remembered);
    update({
      account: { address: remembered, chainId: TEMPO_CHAIN.id },
      restored: true,
    });
  }
  async function run(action: () => Promise<void>) {
    if (snapshot.busy) return;
    const version = ++operation;
    update({ busy: true, error: null });
    try {
      await action();
      if (version !== operation) return;
      walletFlowLog.info('Reading account and active chain from MetaMask');
      await refresh();
      walletFlowLog.info(
        snapshot.account
          ? `Wallet state updated; chain ID ${snapshot.account.chainId}`
          : 'Wallet state updated; no account returned',
      );
      if (
        version === operation &&
        snapshot.account?.chainId !== TEMPO_CHAIN.id
      ) {
        update({
          error: 'Select Tempo Moderato testnet in MetaMask to continue.',
        });
      }
    } catch (error) {
      walletFlowLog.error('Wallet connection or network step failed', error);
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
      subscribers++;
      if (!unsubscribeAdapter) {
        unsubscribeAdapter = adapter.subscribe(() => {
          void refresh();
        });
        void refresh();
      }
      return () => {
        subscribers--;
        if (subscribers === 0) {
          unsubscribeAdapter?.();
          unsubscribeAdapter = undefined;
        }
      };
    },
    refresh,
    restoreRemembered,
    liveAccount: adapter.account,
    signMessage: adapter.signMessage,
    connectAndSign: adapter.connectAndSign,
    sendTransaction: adapter.sendTransaction,
    setError(error: string) {
      update({ error });
    },
    connect: (onStage?: StageListener) =>
      run(async () => {
        disconnected = false;
        const version = operation;
        await adapter.connect(onStage);
        if (version === operation) {
          walletFlowLog.info(
            'Connection complete; starting Tempo network step',
          );
          onStage?.('network');
          await adapter.switchToTempo(onStage);
        }
      }),
    switchToTempo: (onStage?: StageListener) =>
      run(() => adapter.switchToTempo(onStage)),
    async disconnect() {
      if (disconnecting) return;
      disconnecting = true;
      disconnected = true;
      ++operation;
      ++read;
      update({ account: null, busy: true, error: null, restored: true });
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
