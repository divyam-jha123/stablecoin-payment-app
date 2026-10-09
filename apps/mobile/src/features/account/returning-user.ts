import { uiPreviewEnabled } from '../../ui-preview';
import { googleAccount } from './google-account';
import { DEVICE_PIN_OWNER, pinStore, PREVIEW_PIN_OWNER } from './payment-pin';
import { rememberedAccount } from './remembered-account';

/** Resume Google setup after a restart; wallet connection never requires a PIN. */
export async function entryRoute(): Promise<
  '/onboarding' | '/pin-setup' | '/home'
> {
  if (await googleAccount.load()) {
    const owner = uiPreviewEnabled ? PREVIEW_PIN_OWNER : DEVICE_PIN_OWNER;
    return (await pinStore.hasPin(owner)) ? '/home' : '/pin-setup';
  }
  if (uiPreviewEnabled)
    return (await pinStore.hasPin(PREVIEW_PIN_OWNER)) ? '/home' : '/onboarding';
  const owner = await rememberedAccount.load();
  if (!owner) return '/onboarding';
  // Preserve PINs from older installs that stored them per wallet.
  await pinStore.adopt(owner, DEVICE_PIN_OWNER).catch(() => undefined);
  return '/home';
}

export async function hasReturningUser(): Promise<boolean> {
  return (await entryRoute()) !== '/onboarding';
}

/** Disconnecting one account preserves the shared PIN while another remains. */
export async function routeAfterSignOut(): Promise<'/home' | '/onboarding'> {
  if ((await googleAccount.load()) || (await rememberedAccount.load()))
    return '/home';
  await pinStore.clear(uiPreviewEnabled ? PREVIEW_PIN_OWNER : DEVICE_PIN_OWNER);
  return '/onboarding';
}
