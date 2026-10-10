import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uiPreviewEnabled } from '../../ui-preview';
import { previewLoginActivity, previewLoginDevice } from '../../preview-data';
import { walletStore } from './metamask';
import {
  createLoginActivityStore,
  type LoginActivityEntry,
  type LoginActivityKind,
} from './login-activity';
import { thisDevice } from './device-name';

export { thisDevice };

export const loginActivityStore = createLoginActivityStore(AsyncStorage);
void loginActivityStore.hydrate();

/**
 * Notes a sign-in event for the signed-in wallet, or `address` when given.
 * The UI preview keeps its sample history instead.
 */
export function recordLoginActivity(kind: LoginActivityKind, address?: string) {
  if (uiPreviewEnabled) return;
  const owner = address ?? walletStore.getSnapshot().account?.address;
  if (!owner) return;
  const device = thisDevice();
  void loginActivityStore.record(owner, {
    kind,
    at: Date.now(),
    device: device.name,
    detail: device.detail,
  });
}

export function useLoginActivity(address: string | undefined): {
  device: { name: string; detail: string };
  entries: readonly LoginActivityEntry[];
} {
  useSyncExternalStore(
    loginActivityStore.subscribe,
    loginActivityStore.getSnapshot,
  );
  if (uiPreviewEnabled)
    return { device: previewLoginDevice, entries: previewLoginActivity };
  return {
    device: thisDevice(),
    entries: address ? loginActivityStore.list(address) : [],
  };
}
