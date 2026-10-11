import { describe, expect, it } from 'vitest';
import { darkColor, parseColor } from './dark-colors';
import { isNight, nightHours, resolveScheme } from './color-scheme';

// Relative luminance, 0 (black) to 1 (white).
function luminance(value: string) {
  const { r, g, b } = parseColor(value)!;
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('darkColor', () => {
  const card = darkColor('#ffffff', 'bg');
  const page = darkColor('#eef4fe', 'bg');

  it('turns white cards dark, with the page darker behind them', () => {
    expect(luminance(card)).toBeLessThan(0.03);
    expect(luminance(page)).toBeLessThan(luminance(card));
  });

  it('keeps navy ink readable on dark cards', () => {
    const ink = darkColor('#081332', 'fg');
    const muted = darkColor('#5b6b85', 'fg');
    expect(contrast(ink, card)).toBeGreaterThanOrEqual(7);
    expect(contrast(muted, card)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps white text and icons on coloured buttons white', () => {
    expect(darkColor('#ffffff', 'fg')).toBe('#ffffff');
    expect(darkColor('#ffffff', 'auto')).toBe('#ffffff');
  });

  it('keeps saturated and dark fills such as buttons and the balance card', () => {
    expect(darkColor('#2f6bff', 'bg')).toBe('#2f6bff');
    expect(darkColor('#001c57', 'bg')).toBe('#001c57');
  });

  it('brightens brand colours used as text so they read on dark', () => {
    const accent = darkColor('#005ae1', 'fg');
    expect(contrast(accent, card)).toBeGreaterThanOrEqual(4.5);
  });

  it('draws borders a little lighter than the card', () => {
    expect(luminance(darkColor('#d3deef', 'border'))).toBeGreaterThan(
      luminance(card),
    );
  });

  it('keeps alpha and passes non-colours through', () => {
    expect(darkColor('rgba(255, 255, 255, 0.6)', 'bg')).toMatch(
      /^rgba\(\d+, \d+, \d+, 0\.6\)$/,
    );
    expect(darkColor('transparent', 'bg')).toBe('transparent');
    expect(darkColor('url(#wallpaper)', 'auto')).toBe('url(#wallpaper)');
  });
});

describe('resolveScheme', () => {
  const light = {
    mode: 'light',
    fontSize: 'default',
    autoTheme: false,
    nightStart: 19,
    nightEnd: 7,
  } as const;

  it('uses the chosen style, or the phone for System', () => {
    expect(resolveScheme(light, 'dark', 12)).toBe('light');
    expect(resolveScheme({ ...light, mode: 'dark' }, 'light', 12)).toBe('dark');
    expect(resolveScheme({ ...light, mode: 'system' }, 'dark', 12)).toBe(
      'dark',
    );
    expect(resolveScheme({ ...light, mode: 'system' }, 'light', 12)).toBe(
      'light',
    );
  });

  it('follows the clock when Auto Theme is on', () => {
    const auto = { ...light, autoTheme: true } as const;
    expect(resolveScheme(auto, 'light', 22)).toBe('dark');
    expect(resolveScheme(auto, 'light', 6)).toBe('dark');
    expect(resolveScheme(auto, 'dark', 12)).toBe('light');
  });

  it('uses the saved Night Mode hours', () => {
    const late = { ...light, autoTheme: true, nightStart: 22, nightEnd: 6 };
    expect(resolveScheme(late, 'light', 21)).toBe('light');
    expect(resolveScheme(late, 'light', 23)).toBe('dark');
  });

  it('handles windows across and within a day', () => {
    expect(isNight(18, 19, 7)).toBe(false);
    expect(isNight(19, 19, 7)).toBe(true);
    expect(isNight(6, 19, 7)).toBe(true);
    expect(isNight(7, 19, 7)).toBe(false);
    expect(isNight(0, 1, 6)).toBe(false);
    expect(isNight(3, 1, 6)).toBe(true);
    expect(isNight(6, 1, 6)).toBe(false);
  });

  it('formats the window', () => {
    expect(nightHours(19, 7)).toBe('7 PM to 7 AM');
    expect(nightHours(0, 12)).toBe('12 AM to 12 PM');
  });
});
