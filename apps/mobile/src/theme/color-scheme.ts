import type { Scheme } from './themed';
import type { ThemePreferences } from '../features/appearance/theme-preferences';

/**
 * Whether the hour falls in the Night Mode window, which may run past
 * midnight (7 PM to 7 AM) or not (1 AM to 6 AM).
 */
export function isNight(hour: number, start: number, end: number) {
  return start > end
    ? hour >= start || hour < end
    : hour >= start && hour < end;
}

/** "7 PM", "12 AM". */
export function formatHour(hour: number) {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function nightHours(start: number, end: number) {
  return `${formatHour(start)} to ${formatHour(end)}`;
}

/**
 * Which scheme to draw: Auto Theme follows the clock, System follows the
 * phone, and Light or Dark is fixed.
 */
export function resolveScheme(
  preferences: ThemePreferences,
  system: Scheme,
  hour: number,
): Scheme {
  if (preferences.autoTheme)
    return isNight(hour, preferences.nightStart, preferences.nightEnd)
      ? 'dark'
      : 'light';
  return preferences.mode === 'system' ? system : preferences.mode;
}
