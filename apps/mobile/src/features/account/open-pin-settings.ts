import { router } from 'expo-router';
import { pinStore } from './payment-pin';
import { pinOwner } from './pin-owner';

/**
 * Opens the TravelPe PIN: change it, or set one if missing. Returns false
 * when nobody is signed in, so there is no PIN to manage.
 */
export async function openPinSettings() {
  const owner = pinOwner();
  if (!owner) return false;
  const hasPin = await pinStore.hasPin(owner).catch(() => false);
  router.push(
    hasPin
      ? {
          pathname: '/pin-entry',
          params: { mode: 'change', next: 'profile' },
        }
      : { pathname: '/pin-setup', params: { next: 'profile' } },
  );
  return true;
}
