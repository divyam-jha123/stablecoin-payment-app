import { useSyncExternalStore } from 'react';
import { rememberedAccount } from './remembered-account';
import type { useAccount } from './use-account';
import { useExplorer } from './use-explorer';
import { uiPreviewEnabled } from '../../ui-preview';

/** The traveller remembered on this phone; re-renders when it changes. */
export function useRememberedAddress() {
  return useSyncExternalStore(
    rememberedAccount.subscribe,
    rememberedAccount.current,
  );
}

/**
 * Whether the connected wallet has finished signing in: on Tempo, and either
 * verified by the backend or the traveller remembered on this phone. Re-renders
 * when the sign-in completes, wherever it was started.
 */
export function useWalletSignedIn({
  wallet,
  onTempo,
  session,
}: Pick<ReturnType<typeof useAccount>, 'wallet' | 'onTempo' | 'session'>) {
  const remembered = useRememberedAddress();
  const address = wallet.account?.address;
  return Boolean(
    address &&
    onTempo &&
    (session.data === true ||
      remembered?.toLowerCase() === address.toLowerCase()),
  );
}

/**
 * Google-signed-in travellers see the connect-wallet page on wallet-only
 * screens until their wallet has fully signed in, not just connected, so the
 * page stays up (with its progress and errors) for the whole MetaMask flow.
 */
export function useNeedsWallet(
  account: Pick<
    ReturnType<typeof useAccount>,
    'wallet' | 'onTempo' | 'session'
  >,
) {
  const { profile, explorer } = useExplorer();
  const signedIn = useWalletSignedIn(account);
  return uiPreviewEnabled ? explorer : Boolean(profile) && !signedIn;
}
