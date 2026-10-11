import { describe, expect, it } from 'vitest';
import {
  createThemeStore,
  DEFAULT_THEME_PREFERENCES,
  parseThemePreferences,
  THEME_PREFERENCES_KEY,
  type ThemeStorage,
} from './theme-preferences';

function memoryStorage(initial: Record<string, string> = {}): ThemeStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

describe('parseThemePreferences', () => {
  it('falls back to light with auto theme off', () => {
    expect(parseThemePreferences(null)).toEqual(DEFAULT_THEME_PREFERENCES);
    expect(parseThemePreferences('not json')).toEqual(
      DEFAULT_THEME_PREFERENCES,
    );
    expect(parseThemePreferences('[1]')).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  it('keeps valid fields and drops invalid ones', () => {
    expect(
      parseThemePreferences(JSON.stringify({ mode: 'system', autoTheme: 1 })),
    ).toEqual({ ...DEFAULT_THEME_PREFERENCES, mode: 'system' });
    expect(
      parseThemePreferences(JSON.stringify({ mode: 'neon', autoTheme: true })),
    ).toEqual({ ...DEFAULT_THEME_PREFERENCES, autoTheme: true });
  });

  it('keeps a known font size and drops an unknown one', () => {
    const parse = (fontSize: unknown) =>
      parseThemePreferences(JSON.stringify({ fontSize })).fontSize;
    expect(parse('larger')).toBe('larger');
    expect(parse('huge')).toBe('default');
    expect(parse(2)).toBe('default');
  });

  it('keeps a valid Night Mode schedule and rejects a broken one', () => {
    const parse = (schedule: object) =>
      parseThemePreferences(JSON.stringify(schedule));
    expect(parse({ nightStart: 22, nightEnd: 6 })).toMatchObject({
      nightStart: 22,
      nightEnd: 6,
    });
    for (const broken of [
      { nightStart: 22, nightEnd: 22 },
      { nightStart: 24, nightEnd: 6 },
      { nightStart: 21.5, nightEnd: 6 },
      { nightStart: '22', nightEnd: 6 },
    ])
      expect(parse(broken)).toMatchObject({ nightStart: 19, nightEnd: 7 });
  });
});

describe('createThemeStore', () => {
  it('loads saved preferences and saves changes', async () => {
    const storage = memoryStorage({
      [THEME_PREFERENCES_KEY]: JSON.stringify({ mode: 'dark' }),
    });
    const store = createThemeStore(storage);
    await store.hydrate();
    expect(store.getSnapshot()).toEqual({
      ...DEFAULT_THEME_PREFERENCES,
      mode: 'dark',
    });

    store.update({ autoTheme: true });
    const saved = {
      ...DEFAULT_THEME_PREFERENCES,
      mode: 'dark',
      autoTheme: true,
    };
    expect(store.getSnapshot()).toEqual(saved);
    expect(JSON.parse(storage.data[THEME_PREFERENCES_KEY]!)).toEqual(saved);
  });

  it('keeps a choice made before saved preferences finish loading', async () => {
    const storage = memoryStorage({
      [THEME_PREFERENCES_KEY]: JSON.stringify({ mode: 'dark' }),
    });
    const store = createThemeStore(storage);
    const loading = store.hydrate();
    store.update({ mode: 'system' });
    await loading;
    expect(store.getSnapshot().mode).toBe('system');
  });
});
