import { useEffect, useSyncExternalStore } from 'react';
import { googleAccount } from './google-account';
import { walletStore } from './metamask';
import { uiPreviewEnabled } from '../../ui-preview';

/**
 * Google-only visitors: signed in with Google but no wallet yet. They can
 * look around Home and Profile, and connect a wallet when they want to pay.
 * UI preview has no wallet, so a Google profile alone means explorer there.
 */
export function useExplorer() {
  const profile = useSyncExternalStore(
    googleAccount.subscribe,
    googleAccount.snapshot,
  );
  const address = useSyncExternalStore(
    walletStore.subscribe,
    () => walletStore.getSnapshot().account?.address,
  );
  useEffect(() => {
    void googleAccount.load();
  }, []);
  return {
    profile: profile ?? null,
    loaded: profile !== undefined,
    explorer: Boolean(profile) && (uiPreviewEnabled || !address),
  };
}
