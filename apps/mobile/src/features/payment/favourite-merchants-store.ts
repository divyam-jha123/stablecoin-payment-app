import { useMemo, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createFavouriteMerchantStore, favouritesFor } from './merchants';

export const favouriteMerchantStore =
  createFavouriteMerchantStore(AsyncStorage);
void favouriteMerchantStore.hydrate();

/** Merchant keys the owner (wallet address or the UI preview) starred. */
export function useFavouriteMerchants(owner: string | null | undefined) {
  const entries = useSyncExternalStore(
    favouriteMerchantStore.subscribe,
    favouriteMerchantStore.getSnapshot,
  );
  return useMemo(
    () =>
      owner ? favouritesFor(entries, owner.toLowerCase()) : new Set<string>(),
    [entries, owner],
  );
}
