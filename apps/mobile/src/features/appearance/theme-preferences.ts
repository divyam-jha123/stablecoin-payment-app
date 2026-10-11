/**
 * Appearance choices from the Theme & Appearance screen. They are kept on this
 * device only and apply to every account on it.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

export type FontSize = 'small' | 'default' | 'large' | 'larger';

export type ThemePreferences = {
  mode: ThemeMode;
  /** Text size across the app. */
  fontSize: FontSize;
  /** Switch between light and dark on the Night Mode schedule. */
  autoTheme: boolean;
  /** Hour (0-23) Night Mode turns the app dark. */
  nightStart: number;
  /** Hour (0-23) it turns light again; never the same as nightStart. */
  nightEnd: number;
};

export interface ThemeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const THEME_PREFERENCES_KEY = 'traveller.theme-preferences.v1';

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: 'light',
  fontSize: 'default',
  autoTheme: false,
  nightStart: 19,
  nightEnd: 7,
};

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System Default',
};

const MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

/** Each text size, smallest first, with how much it scales designed sizes. */
export const FONT_SIZES: readonly {
  id: FontSize;
  label: string;
  scale: number;
}[] = [
  { id: 'small', label: 'Small', scale: 0.9 },
  { id: 'default', label: 'Default', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.1 },
  { id: 'larger', label: 'Extra Large', scale: 1.2 },
];

export function fontSizeOption(id: FontSize) {
  return FONT_SIZES.find((option) => option.id === id) ?? FONT_SIZES[1]!;
}

function isHour(value: unknown): value is number {
  return (
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23
  );
}

/** Reads saved preferences, falling back to the defaults field by field. */
export function parseThemePreferences(raw: string | null): ThemePreferences {
  let saved: unknown;
  try {
    saved = JSON.parse(raw ?? '{}');
  } catch {
    return DEFAULT_THEME_PREFERENCES;
  }
  if (typeof saved !== 'object' || saved === null)
    return DEFAULT_THEME_PREFERENCES;
  const { mode, fontSize, autoTheme, nightStart, nightEnd } = saved as Record<
    string,
    unknown
  >;
  const schedule =
    isHour(nightStart) && isHour(nightEnd) && nightStart !== nightEnd
      ? { nightStart, nightEnd }
      : {
          nightStart: DEFAULT_THEME_PREFERENCES.nightStart,
          nightEnd: DEFAULT_THEME_PREFERENCES.nightEnd,
        };
  return {
    ...schedule,
    mode: MODES.includes(mode as ThemeMode)
      ? (mode as ThemeMode)
      : DEFAULT_THEME_PREFERENCES.mode,
    fontSize: FONT_SIZES.some((option) => option.id === fontSize)
      ? (fontSize as FontSize)
      : DEFAULT_THEME_PREFERENCES.fontSize,
    autoTheme:
      typeof autoTheme === 'boolean'
        ? autoTheme
        : DEFAULT_THEME_PREFERENCES.autoTheme,
  };
}

export function createThemeStore(storage?: ThemeStorage) {
  let preferences = DEFAULT_THEME_PREFERENCES;
  let changed = false;
  const listeners = new Set<() => void>();
  function publish(next: ThemePreferences) {
    preferences = next;
    changed = true;
    listeners.forEach((listener) => listener());
    void storage
      ?.setItem(THEME_PREFERENCES_KEY, JSON.stringify(preferences))
      .catch(() => undefined);
  }
  return {
    getSnapshot: () => preferences,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Loads saved preferences unless the user already changed them. */
    async hydrate() {
      if (!storage) return;
      try {
        const saved = parseThemePreferences(
          await storage.getItem(THEME_PREFERENCES_KEY),
        );
        if (changed) return;
        preferences = saved;
        listeners.forEach((listener) => listener());
      } catch {
        // Unreadable storage keeps the defaults.
      }
    },
    update(patch: Partial<ThemePreferences>) {
      publish({ ...preferences, ...patch });
    },
  };
}
