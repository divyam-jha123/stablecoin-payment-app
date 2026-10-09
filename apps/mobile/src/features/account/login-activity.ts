/**
 * Sign-in history kept on this phone: wallet sign-ins, app unlocks, PIN
 * changes and sign-outs, per wallet. Nothing is sent to a server.
 */

export type LoginActivityKind =
  'sign-in' | 'unlock' | 'pin-set' | 'pin-changed' | 'sign-out';

export type LoginActivityEntry = {
  id: string;
  kind: LoginActivityKind;
  /** Milliseconds since the epoch. */
  at: number;
  /** Phone model, such as "Google Pixel 8". */
  device: string;
  /** A place when one is known, otherwise the OS, such as "Android 15". */
  detail: string;
};

export interface LoginActivityStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const LOGIN_ACTIVITY_KEY = 'traveller.login-activity.v1';
export const MAX_ENTRIES = 50;

const KINDS: readonly LoginActivityKind[] = [
  'sign-in',
  'unlock',
  'pin-set',
  'pin-changed',
  'sign-out',
];

export const KIND_LABELS: Record<LoginActivityKind, string> = {
  'sign-in': 'Signed in with MetaMask',
  unlock: 'App unlocked',
  'pin-set': 'Transaction PIN set',
  'pin-changed': 'Transaction PIN changed',
  'sign-out': 'Signed out',
};

function isEntry(value: unknown): value is LoginActivityEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    KINDS.includes(entry.kind as LoginActivityKind) &&
    typeof entry.at === 'number' &&
    Number.isFinite(entry.at) &&
    typeof entry.device === 'string' &&
    typeof entry.detail === 'string'
  );
}

/** Newest first, without duplicates, at most `MAX_ENTRIES`. */
function tidy(entries: readonly LoginActivityEntry[]) {
  const seen = new Set<string>();
  return [...entries]
    .sort((a, b) => b.at - a.at)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .slice(0, MAX_ENTRIES);
}

type History = Readonly<Record<string, readonly LoginActivityEntry[]>>;

export function createLoginActivityStore(storage?: LoginActivityStorage) {
  let history: History = {};
  const listeners = new Set<() => void>();
  let loaded: Promise<void> | null = null;

  function publish(next: History) {
    history = next;
    listeners.forEach((listener) => listener());
  }

  async function load() {
    if (!storage) return;
    try {
      const saved: unknown = JSON.parse(
        (await storage.getItem(LOGIN_ACTIVITY_KEY)) ?? '{}',
      );
      if (typeof saved !== 'object' || saved === null) return;
      const merged: Record<string, readonly LoginActivityEntry[]> = {
        ...history,
      };
      for (const [owner, entries] of Object.entries(saved)) {
        if (!Array.isArray(entries)) continue;
        merged[owner] = tidy([
          ...(merged[owner] ?? []),
          ...entries.filter(isEntry),
        ]);
      }
      publish(merged);
    } catch {
      // Unreadable storage only loses earlier history.
    }
  }

  const store = {
    getSnapshot: () => history,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate() {
      loaded ??= load();
      return loaded;
    },
    list(owner: string): readonly LoginActivityEntry[] {
      return history[owner.toLowerCase()] ?? [];
    },
    /** Adds an entry after saved history has loaded, so none is overwritten. */
    async record(owner: string, entry: Omit<LoginActivityEntry, 'id'>) {
      await store.hydrate();
      const key = owner.toLowerCase();
      const id = `${entry.at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      publish({
        ...history,
        [key]: tidy([{ ...entry, id }, ...(history[key] ?? [])]),
      });
      await storage
        ?.setItem(LOGIN_ACTIVITY_KEY, JSON.stringify(history))
        .catch(() => undefined);
    },
  };
  return store;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "Just now", "2 minutes ago", "3 hours ago", "4 days ago", "12 Oct". */
export function relativeTime(at: number, now: number) {
  const gap = Math.max(0, now - at);
  if (gap < MINUTE) return 'Just now';
  if (gap < HOUR) {
    const minutes = Math.floor(gap / MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (gap < DAY) {
    const hours = Math.floor(gap / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (gap < 7 * DAY) {
    const days = Math.floor(gap / DAY);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  const date = new Date(at);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "9:41 AM" in the phone's time zone. */
export function clockTime(at: number) {
  const date = new Date(at);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

function startOfDay(at: number) {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** "Today", "Yesterday" or "12 Oct 2026". */
export function dayLabel(at: number, now: number) {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(at);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Entries split into days, newest day first. */
export function groupByDay(
  entries: readonly LoginActivityEntry[],
  now: number,
) {
  const groups: { label: string; entries: LoginActivityEntry[] }[] = [];
  for (const entry of [...entries].sort((a, b) => b.at - a.at)) {
    const label = dayLabel(entry.at, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}

/** Counts for the overview: sign-ins and unlocks in 30 days, last PIN change. */
export function activityOverview(
  entries: readonly LoginActivityEntry[],
  now: number,
) {
  const recent = entries.filter((entry) => now - entry.at <= 30 * DAY);
  const pin = entries
    .filter((entry) => entry.kind === 'pin-set' || entry.kind === 'pin-changed')
    .sort((a, b) => b.at - a.at)[0];
  return {
    signIns: recent.filter((entry) => entry.kind === 'sign-in').length,
    unlocks: recent.filter((entry) => entry.kind === 'unlock').length,
    lastPinChange: pin?.at ?? null,
  };
}
