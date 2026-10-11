/**
 * Turns the app's light-theme colours into dark-theme ones. Screens are styled
 * with light colours; in dark mode each colour is remapped by the job it does:
 *
 * - `fg`: text and icons. Dark ink becomes light, brand colours brighten a
 *   little, and colours already light (white text on a blue button) stay.
 * - `bg`: surfaces. White cards become dark cards, pale page washes become the
 *   darker page behind them, pale tinted chips become deep tinted chips, and
 *   saturated or already-dark fills (buttons, the balance card) stay.
 * - `border`: hairlines become a slightly lighter line than the card.
 * - `auto`: SVG fills, which can be either. White stays (icons on coloured
 *   buttons), pale tints act as surfaces, and the rest act as ink.
 */
export type ColorRole = 'fg' | 'bg' | 'border' | 'auto';

type Rgba = { r: number; g: number; b: number; a: number };
type Hsl = { h: number; s: number; l: number };

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGBA =
  /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/i;

export function parseColor(value: string): Rgba | null {
  const hex = HEX.exec(value.trim());
  if (hex) {
    let digits = hex[1]!;
    if (digits.length <= 4)
      digits = Array.from(digits, (digit) => digit + digit).join('');
    const channel = (index: number) =>
      parseInt(digits.slice(index * 2, index * 2 + 2), 16);
    return {
      r: channel(0),
      g: channel(1),
      b: channel(2),
      a: digits.length === 8 ? channel(3) / 255 : 1,
    };
  }
  const rgba = RGBA.exec(value.trim());
  if (rgba)
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] === undefined || rgba[4] === '' ? 1 : Number(rgba[4]),
    };
  return null;
}

function toHsl({ r, g, b }: Rgba): Hsl {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === red
      ? (green - blue) / d + (green < blue ? 6 : 0)
      : max === green
        ? (blue - red) / d + 2
        : (red - green) / d + 4;
  return { h: h * 60, s, l };
}

function fromHsl({ h, s, l }: Hsl, a: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const chroma = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(
      255 * (l - chroma * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))),
    );
  const [r, g, b] = [f(0), f(8), f(4)];
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${a})`;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

// Neutral greys and white take the app's navy hue so dark surfaces match.
const NAVY_HUE = 222;

function foreground({ h, s, l }: Hsl): Hsl {
  if (s >= 0.45 && l >= 0.12 && l <= 0.85)
    return { h, s, l: clamp(l, 0.62, 0.85) };
  if (l < 0.6) return { h, s: s * 0.5, l: 0.95 - l * 0.55 };
  return { h, s, l };
}

function background({ h, s, l }: Hsl): Hsl {
  const hue = s < 0.05 ? NAVY_HUE : h;
  // White cards and sheets.
  if (l >= 0.985) return { h: NAVY_HUE, s: 0.3, l: 0.13 };
  // Pale page washes sit behind the cards, so they go darker than them.
  if (l >= 0.955) return { h: hue, s: 0.35, l: 0.075 };
  // Pale tinted chips and panels keep a hint of their hue.
  if (l >= 0.8)
    return { h: hue, s: Math.min(s, 0.45), l: 0.2 - (l - 0.8) * 0.3 };
  // Saturated fills (buttons, badges) and dark fills already read on dark.
  if (s >= 0.45 || l < 0.35) return { h, s, l };
  return { h: hue, s: Math.min(s, 0.3), l: 0.28 - (l - 0.35) * 0.2 };
}

function border({ h, s, l }: Hsl): Hsl {
  const hue = s < 0.05 ? NAVY_HUE : h;
  if (l >= 0.7)
    return { h: hue, s: Math.min(s, 0.35), l: 0.2 + (1 - l) * 0.25 };
  if (s >= 0.45 || l < 0.35) return { h, s, l };
  return { h: hue, s: Math.min(s, 0.3), l: 0.3 };
}

const ROLES: Record<ColorRole, (hsl: Hsl) => Hsl> = {
  fg: foreground,
  bg: background,
  border,
  auto: (hsl) =>
    hsl.l >= 0.985 ? hsl : hsl.l >= 0.8 ? background(hsl) : foreground(hsl),
};

/** The dark-theme colour for a light-theme one; non-colours pass through. */
export function darkColor(value: string, role: ColorRole): string {
  const rgba = parseColor(value);
  if (!rgba) return value;
  return fromHsl(ROLES[role](toHsl(rgba)), rgba.a);
}
