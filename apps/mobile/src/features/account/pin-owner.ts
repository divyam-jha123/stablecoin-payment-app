import { uiPreviewEnabled } from '../../ui-preview';
import { DEVICE_PIN_OWNER, PREVIEW_PIN_OWNER } from './payment-pin';

/** Whose payment PIN applies: this phone's, or the UI preview's. */
export function pinOwner() {
  return uiPreviewEnabled ? PREVIEW_PIN_OWNER : DEVICE_PIN_OWNER;
}
