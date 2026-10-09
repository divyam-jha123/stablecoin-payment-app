import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uiPreviewEnabled } from '../../ui-preview';
import { walletStore } from './metamask';
import {
  createProfileStore,
  PREVIEW_PROFILE_OWNER,
  type ProfileDetails,
} from './profile-details';

export const profileStore = createProfileStore(AsyncStorage);
void profileStore.hydrate();

/** Whose profile applies: the UI preview's, or the signed-in wallet's. */
export function profileOwner(address: string | undefined) {
  return uiPreviewEnabled
    ? PREVIEW_PROFILE_OWNER
    : (address ?? walletStore.getSnapshot().account?.address)?.toLowerCase();
}

export function useProfileDetails(
  address: string | undefined,
): ProfileDetails | null {
  useSyncExternalStore(profileStore.subscribe, profileStore.getSnapshot);
  const owner = profileOwner(address);
  return owner ? profileStore.get(owner) : null;
}
