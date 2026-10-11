import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createThemeStore, type ThemePreferences } from './theme-preferences';

export const themeStore = createThemeStore(AsyncStorage);
void themeStore.hydrate();

export function useThemePreferences(): ThemePreferences {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot);
}
