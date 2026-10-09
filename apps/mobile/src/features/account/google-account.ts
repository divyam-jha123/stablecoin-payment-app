import * as SecureStore from 'expo-secure-store';
import { createGoogleAccountStore } from './google-account-store';

const ITEM = 'traveller.google-account.v1';

export const googleAccount = createGoogleAccountStore({
  get: () => SecureStore.getItemAsync(ITEM),
  set: (value) => SecureStore.setItemAsync(ITEM, value),
  remove: () => SecureStore.deleteItemAsync(ITEM),
});
