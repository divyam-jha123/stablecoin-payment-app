import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRecentSearchStore } from './recent-searches';

export const recentSearchStore = createRecentSearchStore(AsyncStorage);
void recentSearchStore.hydrate();

export function useRecentSearches(): readonly string[] {
  return useSyncExternalStore(
    recentSearchStore.subscribe,
    recentSearchStore.getSnapshot,
  );
}
