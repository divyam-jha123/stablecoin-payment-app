import { describe, expect, it } from 'vitest';
import {
  activityOverview,
  clockTime,
  createLoginActivityStore,
  dayLabel,
  groupByDay,
  LOGIN_ACTIVITY_KEY,
  MAX_ENTRIES,
  relativeTime,
  type LoginActivityEntry,
} from './login-activity';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 9, 10, 13, 39).getTime();

function memoryStorage(initial: Record<string, string> = {}) {
  const items = { ...initial };
  return {
    items,
    getItem: async (key: string) => items[key] ?? null,
    setItem: async (key: string, value: string) => {
      items[key] = value;
    },
  };
}

function entry(
  kind: LoginActivityEntry['kind'],
  at: number,
  id = `${kind}-${at}`,
): LoginActivityEntry {
  return { id, kind, at, device: 'Google Pixel 8', detail: 'Android 15' };
}

describe('login activity store', () => {
  it('records newest first per wallet, ignoring address case', async () => {
    const storage = memoryStorage();
    const store = createLoginActivityStore(storage);
    await store.record('0xABC', { ...entry('sign-in', NOW - HOUR) });
    await store.record('0xabc', { ...entry('unlock', NOW) });
    expect(store.list('0xAbC').map((item) => item.kind)).toEqual([
      'unlock',
      'sign-in',
    ]);
    expect(store.list('0xother')).toEqual([]);
    expect(JSON.parse(storage.items[LOGIN_ACTIVITY_KEY]!)).toHaveProperty(
      '0xabc',
    );
  });

  it('keeps saved history when recording before it has loaded', async () => {
    const storage = memoryStorage({
      [LOGIN_ACTIVITY_KEY]: JSON.stringify({
        '0xabc': [entry('sign-in', NOW - DAY, 'saved')],
      }),
    });
    const store = createLoginActivityStore(storage);
    await store.record('0xabc', entry('unlock', NOW));
    expect(store.list('0xabc').map((item) => item.id)).toContain('saved');
    expect(store.list('0xabc')).toHaveLength(2);
  });

  it('drops malformed saved entries and caps the history', async () => {
    const saved = Array.from({ length: MAX_ENTRIES + 5 }, (_, index) =>
      entry('unlock', NOW - index * MINUTE),
    );
    const storage = memoryStorage({
      [LOGIN_ACTIVITY_KEY]: JSON.stringify({
        '0xabc': [...saved, { id: 'bad', kind: 'hacked', at: 'soon' }],
      }),
    });
    const store = createLoginActivityStore(storage);
    await store.hydrate();
    const list = store.list('0xabc');
    expect(list).toHaveLength(MAX_ENTRIES);
    expect(list.some((item) => item.id === 'bad')).toBe(false);
  });

  it('survives unreadable storage', async () => {
    const store = createLoginActivityStore(
      memoryStorage({ [LOGIN_ACTIVITY_KEY]: '{not json' }),
    );
    await store.hydrate();
    expect(store.list('0xabc')).toEqual([]);
  });
});

describe('login activity formatting', () => {
  it('describes how long ago something happened', () => {
    expect(relativeTime(NOW - 20_000, NOW)).toBe('Just now');
    expect(relativeTime(NOW - MINUTE, NOW)).toBe('1 minute ago');
    expect(relativeTime(NOW - 2 * MINUTE, NOW)).toBe('2 minutes ago');
    expect(relativeTime(NOW - 3 * HOUR, NOW)).toBe('3 hours ago');
    expect(relativeTime(NOW - 4 * DAY, NOW)).toBe('4 days ago');
    expect(relativeTime(new Date(2026, 8, 12).getTime(), NOW)).toBe('12 Sep');
  });

  it('formats the clock time and the day', () => {
    expect(clockTime(new Date(2026, 9, 10, 0, 5).getTime())).toBe('12:05 AM');
    expect(clockTime(new Date(2026, 9, 10, 13, 39).getTime())).toBe('1:39 PM');
    expect(dayLabel(NOW - HOUR, NOW)).toBe('Today');
    expect(dayLabel(NOW - DAY, NOW)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 9, 1).getTime(), NOW)).toBe('1 Oct 2026');
  });

  it('groups entries by day, newest first', () => {
    const groups = groupByDay(
      [
        entry('sign-in', NOW - DAY),
        entry('unlock', NOW - MINUTE),
        entry('pin-changed', NOW - DAY - HOUR),
      ],
      NOW,
    );
    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday']);
    expect(groups[1]!.entries.map((item) => item.kind)).toEqual([
      'sign-in',
      'pin-changed',
    ]);
  });

  it('summarises the last 30 days and the latest PIN change', () => {
    const overview = activityOverview(
      [
        entry('sign-in', NOW - DAY),
        entry('sign-in', NOW - 40 * DAY),
        entry('unlock', NOW - HOUR),
        entry('unlock', NOW - 2 * HOUR),
        entry('pin-set', NOW - 10 * DAY),
        entry('pin-changed', NOW - 3 * DAY),
      ],
      NOW,
    );
    expect(overview).toEqual({
      signIns: 1,
      unlocks: 2,
      lastPinChange: NOW - 3 * DAY,
    });
    expect(activityOverview([], NOW).lastPinChange).toBeNull();
  });
});
