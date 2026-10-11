import { afterEach, describe, expect, it, vi } from 'vitest';

// StyleSheet.create is identity enough for checking the computed values.
vi.mock('react-native', () => ({
  StyleSheet: { create: <T>(styles: T) => styles },
}));

const { setActiveFontScale, setActiveScheme, tc, themedStyleSheet } =
  await import('./themed');

afterEach(() => {
  setActiveScheme('light');
  setActiveFontScale(1);
});

describe('themedStyleSheet', () => {
  const styles = themedStyleSheet({
    title: { color: '#081332', fontSize: 20, lineHeight: 26, padding: 8 },
    card: { backgroundColor: '#ffffff' },
  });

  it('returns the designed styles in light at the default size', () => {
    expect(styles.title).toEqual({
      color: '#081332',
      fontSize: 20,
      lineHeight: 26,
      padding: 8,
    });
  });

  it('scales text, not layout, with the Font Size setting', () => {
    setActiveFontScale(1.2);
    expect(styles.title).toMatchObject({
      color: '#081332',
      fontSize: 24,
      lineHeight: 31,
      padding: 8,
    });
  });

  it('switches colours in dark and keeps the text size', () => {
    setActiveScheme('dark');
    setActiveFontScale(0.9);
    expect(styles.title.color).not.toBe('#081332');
    expect(styles.title.fontSize).toBe(18);
    expect(styles.card.backgroundColor).not.toBe('#ffffff');
  });
});

describe('tc', () => {
  it('leaves colours alone in light and maps them once in dark', () => {
    expect(tc('#081332')).toBe('#081332');
    setActiveScheme('dark');
    const dark = tc('#081332');
    expect(dark).not.toBe('#081332');
    expect(tc(dark)).toBe(dark);
  });
});
