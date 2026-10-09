import { uiPreviewEnabled } from '../../ui-preview';
import { walletStore } from './metamask';
import { PREVIEW_PIN_OWNER } from './payment-pin';

/** Whose payment PIN applies: the signed-in wallet, or the UI preview's. */
export function pinOwner() {
  return uiPreviewEnabled
    ? PREVIEW_PIN_OWNER
    : walletStore.getSnapshot().account?.address;
}
