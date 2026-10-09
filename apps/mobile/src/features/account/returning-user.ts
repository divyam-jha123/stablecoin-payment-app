import { uiPreviewEnabled } from '../../ui-preview';
import { pinStore, PREVIEW_PIN_OWNER } from './payment-pin';
import { rememberedAccount } from './remembered-account';

/** A saved payment PIN marks completed setup; sign-in uses device authentication. */
export async function hasReturningUser(): Promise<boolean> {
  if (uiPreviewEnabled) return pinStore.hasPin(PREVIEW_PIN_OWNER);
  const owner = await rememberedAccount.load();
  return owner ? pinStore.hasPin(owner) : false;
}
