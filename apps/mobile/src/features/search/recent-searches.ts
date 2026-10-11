export const RECENT_SEARCHES_KEY = 'travelpe.recent-searches.v1';
export const MAX_RECENT_SEARCHES = 8;
const MAX_LENGTH = 120;

export interface RecentSearchStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Saved searches from storage; anything unreadable becomes an empty list. */
export function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, MAX_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

/** Newest first, one entry per search ignoring case. */
export function withRecentSearch(list: readonly string[], query: string) {
  const text = query.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH);
  if (text.length < 2) return [...list];
  return [
    text,
    ...list.filter((item) => item.toLowerCase() !== text.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);
}

export function createRecentSearchStore(storage?: RecentSearchStorage) {
  let searches: string[] = [];
  let changed = false;
  const listeners = new Set<() => void>();
  function publish(next: string[]) {
    searches = next;
    changed = true;
    listeners.forEach((listener) => listener());
    void storage
      ?.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
      .catch(() => undefined);
  }
  return {
    getSnapshot: () => searches,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Loads saved searches unless the user already changed them. */
    async hydrate() {
      if (!storage) return;
      try {
        const saved = parseRecentSearches(
          await storage.getItem(RECENT_SEARCHES_KEY),
        );
        if (changed) return;
        searches = saved;
        listeners.forEach((listener) => listener());
      } catch {
        // Unreadable storage keeps an empty list.
      }
    },
    add(query: string) {
      const next = withRecentSearch(searches, query);
      if (next.join('\n') !== searches.join('\n')) publish(next);
    },
    remove(query: string) {
      publish(searches.filter((item) => item !== query));
    },
    clear() {
      publish([]);
    },
  };
}
