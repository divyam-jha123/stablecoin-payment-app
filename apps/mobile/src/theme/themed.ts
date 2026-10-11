import { StyleSheet } from 'react-native';
import { darkColor, type ColorRole } from './dark-colors';

export type Scheme = 'light' | 'dark';

let active: Scheme = 'light';

/** The scheme screens draw with right now; set by the colour-scheme store. */
export function activeScheme(): Scheme {
  return active;
}

export function setActiveScheme(scheme: Scheme) {
  active = scheme;
}

let fontScale = 1;

/** How much bigger or smaller text is drawn; 1 is the designed size. */
export function activeFontScale(): number {
  return fontScale;
}

export function setActiveFontScale(scale: number) {
  fontScale = scale;
}

const cache = new Map<string, string>();
// Colours tc() already produced, so passing one through again is harmless.
const produced = new Set<string>();

/**
 * A light-theme colour as the active scheme shows it. Read it while rendering,
 * never at module load, so a theme change picks up the new value.
 */
export function tc<T>(value: T, role: ColorRole = 'fg'): T {
  if (active === 'light' || typeof value !== 'string') return value;
  if (produced.has(value)) return value;
  const key = `${role}:${value}`;
  let dark = cache.get(key);
  if (dark === undefined) {
    dark = darkColor(value, role);
    cache.set(key, dark);
    produced.add(dark);
  }
  return dark as T;
}

const STYLE_ROLES: Record<string, ColorRole> = {
  color: 'fg',
  tintColor: 'fg',
  textDecorationColor: 'fg',
  backgroundColor: 'bg',
  overlayColor: 'bg',
  borderColor: 'border',
  borderTopColor: 'border',
  borderBottomColor: 'border',
  borderLeftColor: 'border',
  borderRightColor: 'border',
  borderStartColor: 'border',
  borderEndColor: 'border',
  borderBlockColor: 'border',
  borderBlockStartColor: 'border',
  borderBlockEndColor: 'border',
  outlineColor: 'border',
};

function adjustStyle(
  style: Record<string, unknown>,
  dark: boolean,
  scale: number,
) {
  const next: Record<string, unknown> = { ...style };
  for (const [key, value] of Object.entries(style)) {
    const role = STYLE_ROLES[key];
    if (dark && role && typeof value === 'string')
      next[key] = darkColor(value, role);
    if (
      scale !== 1 &&
      (key === 'fontSize' || key === 'lineHeight') &&
      typeof value === 'number'
    )
      next[key] = Math.round(value * scale);
  }
  return next;
}

/**
 * StyleSheet.create that follows the theme and the Font Size setting. Write
 * light colours and designed font sizes as usual; reading `styles.x` during
 * render returns the version for the active scheme and text size.
 */
export function themedStyleSheet<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<unknown>,
>(styles: T & StyleSheet.NamedStyles<unknown>): T {
  const light = StyleSheet.create(styles);
  // Built on first use, one per scheme and text size.
  const variants = new Map<string, T>();
  function variant(): T {
    if (active === 'light' && fontScale === 1) return light;
    const id = `${active}:${fontScale}`;
    let sheet = variants.get(id);
    if (!sheet) {
      sheet = StyleSheet.create(
        Object.fromEntries(
          Object.entries(styles).map(([name, style]) => [
            name,
            adjustStyle(
              style as Record<string, unknown>,
              active === 'dark',
              fontScale,
            ),
          ]),
        ) as unknown as T & StyleSheet.NamedStyles<unknown>,
      );
      variants.set(id, sheet);
    }
    return sheet;
  }
  const themed = {} as T;
  for (const key of Object.keys(styles) as (keyof T)[]) {
    Object.defineProperty(themed, key, {
      enumerable: true,
      get: () => variant()[key],
    });
  }
  return themed;
}
