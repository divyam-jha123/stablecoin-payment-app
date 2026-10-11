import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { themeStore } from '../features/appearance/theme-preferences-store';
import { resolveScheme } from './color-scheme';
import { fontSizeOption } from '../features/appearance/theme-preferences';
import {
  activeFontScale,
  activeScheme,
  setActiveFontScale,
  setActiveScheme,
  type Scheme,
} from './themed';

const listeners = new Set<() => void>();
let clock: ReturnType<typeof setInterval> | null = null;
let override: 'light' | 'dark' | 'unspecified' | null = null;
// Changes whenever the scheme or text size does, to re-render subscribers.
let snapshot = '';

function systemScheme(): Scheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

// Tell native views (alerts, keyboards, pickers) which scheme to use; with
// 'unspecified' they, and Appearance, follow the phone again.
function setNativeScheme(next: 'light' | 'dark' | 'unspecified') {
  if (override === next) return;
  override = next;
  try {
    Appearance.setColorScheme(next);
  } catch {
    // Older OS versions cannot override; the app's own colours still switch.
  }
}

function update() {
  const preferences = themeStore.getSnapshot();
  const followsPhone = !preferences.autoTheme && preferences.mode === 'system';
  if (followsPhone) setNativeScheme('unspecified');
  const next = resolveScheme(
    preferences,
    systemScheme(),
    new Date().getHours(),
  );
  if (!followsPhone) setNativeScheme(next);

  // Auto Theme checks the clock each minute while it is on.
  if (preferences.autoTheme && !clock) clock = setInterval(update, 60_000);
  if (!preferences.autoTheme && clock) {
    clearInterval(clock);
    clock = null;
  }

  const scale = fontSizeOption(preferences.fontSize).scale;
  if (next === activeScheme() && scale === activeFontScale()) return;
  setActiveScheme(next);
  setActiveFontScale(scale);
  snapshot = `${next}:${scale}`;
  listeners.forEach((listener) => listener());
}

themeStore.subscribe(update);
Appearance.addChangeListener(() => {
  if (override === 'unspecified') update();
});
update();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The scheme screens draw with; re-renders the caller when it or the text
 * size changes.
 */
export function useScheme(): Scheme {
  useSyncExternalStore(subscribe, () => snapshot);
  return activeScheme();
}
