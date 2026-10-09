import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uiPreviewEnabled } from '../../ui-preview';
import { previewLoginActivity, previewLoginDevice } from '../../preview-data';
import { walletStore } from './metamask';
import {
  createLoginActivityStore,
  type LoginActivityEntry,
  type LoginActivityKind,
} from './login-activity';

export const loginActivityStore = createLoginActivityStore(AsyncStorage);
void loginActivityStore.hydrate();

function titleCase(value: string) {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/** This phone's model and OS, such as "Google Pixel 8" and "Android 15". */
export function thisDevice() {
  if (Platform.OS === 'android') {
    const { Brand, Model, Release } = Platform.constants;
    const brand = titleCase(Brand ?? '');
    const model = Model ?? 'Android phone';
    return {
      name: model.toLowerCase().startsWith(brand.toLowerCase())
        ? model
        : `${brand} ${model}`.trim(),
      detail: `Android ${Release}`,
    };
  }
  if (Platform.OS === 'ios')
    return {
      name: Platform.isPad ? 'iPad' : 'iPhone',
      detail: `iOS ${Platform.Version}`,
    };
  return { name: 'This device', detail: Platform.OS };
}

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
