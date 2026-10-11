import { describe, expect, it } from 'vitest';
import {
  createRecentSearchStore,
  MAX_RECENT_SEARCHES,
  parseRecentSearches,
  RECENT_SEARCHES_KEY,
  withRecentSearch,
} from './recent-searches';

function memoryStorage(initial: string | null = null) {
  const data = new Map<string, string>();
  if (initial !== null) data.set(RECENT_SEARCHES_KEY, initial);
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('recent searches', () => {
  it('keeps newest first without case duplicates', () => {
    expect(withRecentSearch(['Activity', 'chai'], ' activity ')).toEqual([
      'activity',
      'chai',
    ]);
    expect(withRecentSearch(['chai'], 'a')).toEqual(['chai']);
    const many = Array.from({ length: 20 }, (_, i) => `search ${i}`);
    expect(
      many.reduce<string[]>((list, item) => withRecentSearch(list, item), []),
    ).toHaveLength(MAX_RECENT_SEARCHES);
  });

  it('ignores unreadable storage', () => {
    expect(parseRecentSearches('nope')).toEqual([]);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
    expect(parseRecentSearches('["chai", 4, "  "]')).toEqual(['chai']);
  });

  it('adds, removes, clears and persists', async () => {
    const storage = memoryStorage('["profile"]');
    const store = createRecentSearchStore(storage);
    await store.hydrate();
    expect(store.getSnapshot()).toEqual(['profile']);
    store.add('Starbucks');
    expect(store.getSnapshot()).toEqual(['Starbucks', 'profile']);
    store.remove('profile');
    expect(store.getSnapshot()).toEqual(['Starbucks']);
    store.clear();
    expect(store.getSnapshot()).toEqual([]);
    await Promise.resolve();
    expect(storage.data.get(RECENT_SEARCHES_KEY)).toBe('[]');
  });
});
