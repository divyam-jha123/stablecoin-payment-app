import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { walletStore } from './metamask';
import { restoreSession } from './session';
import { TEMPO_CHAIN } from './tempo';
import { uiPreviewEnabled } from '../../ui-preview';
import { walletFlowLog } from './wallet-flow-log';

export function useAccount() {
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    if (!uiPreviewEnabled) return walletStore.start();
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (!uiPreviewEnabled) void walletStore.refresh();
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      walletFlowLog.appState(state);
      setActive(state === 'active');
      if (state === 'active' && !uiPreviewEnabled) void walletStore.refresh();
    });
    return () => listener.remove();
  }, []);
  const onTempo = wallet.account?.chainId === TEMPO_CHAIN.id;
  const session = useQuery({
    queryKey: ['session', wallet.account?.address, wallet.account?.chainId],
    queryFn: () => restoreSession(wallet.account!),
    enabled: Boolean(
      !uiPreviewEnabled &&
      wallet.account &&
      onTempo &&
      focused &&
      active &&
      !wallet.busy,
    ),
    retry: false,
    staleTime: 0,
    refetchInterval: focused && active ? 60_000 : false,
  });
  return { wallet, onTempo, session, foreground: focused && active };
}
