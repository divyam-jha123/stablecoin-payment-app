import { recipientKey, type SimulatedPayment } from './simulated-payments';

const DAY = 86_400_000;
/** "Recent" on Payments means paid within this many days. */
export const RECENT_DAYS = 7;

/** Everything paid to one merchant or person, for the Payments list. */
export type MerchantSummary = {
  key: string;
  name: string;
  vpa: string | null;
  /** INR paid in total. */
  total: number;
  /** INR of the newest payment. */
  lastAmount: number;
  lastPaidAt: number;
  count: number;
};

export type MerchantFilter = 'all' | 'recent' | 'favourites';
export type MerchantSort = 'recent' | 'total' | 'name';

export const merchantSortLabels: Record<MerchantSort, string> = {
  recent: 'Most recent',
  total: 'Highest paid',
  name: 'Name A–Z',
};

export function nextMerchantSort(sort: MerchantSort): MerchantSort {
  return sort === 'recent' ? 'total' : sort === 'total' ? 'name' : 'recent';
}

/** One summary per merchant, newest payment first. */
export function merchantSummaries(
  payments: readonly SimulatedPayment[],
): MerchantSummary[] {
  const byKey = new Map<string, MerchantSummary>();
  for (const payment of [...payments].sort(
    (a, b) => b.createdAt - a.createdAt,
  )) {
    const name = payment.merchantName.trim();
    const amount = Number(payment.inrAmount);
    if (!name || !Number.isFinite(amount)) continue;
    const key = recipientKey(payment);
    const known = byKey.get(key);
    if (known) {
      known.total += amount;
      known.count += 1;
      continue;
    }
    byKey.set(key, {
      key,
      name,
      vpa: payment.merchantVpa ?? null,
      total: amount,
      lastAmount: amount,
      lastPaidAt: payment.createdAt,
      count: 1,
    });
  }
  return [...byKey.values()];
}

/** INR paid in the calendar month of `now`. */
export function monthTotal(
  payments: readonly SimulatedPayment[],
  now = Date.now(),
) {
  const today = new Date(now);
  return payments.reduce((total, payment) => {
    const date = new Date(payment.createdAt);
    const amount = Number(payment.inrAmount);
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      Number.isFinite(amount)
      ? total + amount
      : total;
  }, 0);
}

/** Search, filter and sort the merchant list. */
export function visibleMerchants(
  merchants: readonly MerchantSummary[],
  {
    query,
    filter,
    sort,
    favourites,
    now = Date.now(),
  }: {
    query: string;
    filter: MerchantFilter;
    sort: MerchantSort;
    favourites: ReadonlySet<string>;
    now?: number;
  },
): MerchantSummary[] {
  const needle = query.trim().toLowerCase();
  return merchants
    .filter(
      (merchant) =>
        !needle ||
        merchant.name.toLowerCase().includes(needle) ||
        merchant.vpa?.toLowerCase().includes(needle),
    )
    .filter((merchant) =>
      filter === 'favourites'
        ? favourites.has(merchant.key)
        : filter === 'recent'
          ? now - merchant.lastPaidAt <= RECENT_DAYS * DAY
          : true,
    )
    .sort((a, b) =>
      sort === 'total'
        ? b.total - a.total
        : sort === 'name'
          ? a.name.localeCompare(b.name)
          : b.lastPaidAt - a.lastPaidAt,
    );
}

/** Up to two initials, e.g. "Café Lotus" -> "CL", "Ujjwal" -> "U". */
export function merchantInitials(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? '')
    .join('');
}

/** "Today", "Yesterday" or a short date such as "9 Oct". */
export function paidDayLabel(createdAt: number, now = Date.now()) {
  const date = new Date(createdAt);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export interface FavouriteStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const FAVOURITE_MERCHANTS_KEY = 'traveller.favourite-merchants.v1';

/**
 * Starred merchants kept on this device, per wallet. Entries are
 * "<owner>|<merchant key>" so a wallet never sees another's favourites.
 */
export function createFavouriteMerchantStore(storage?: FavouriteStorage) {
  let entries: ReadonlySet<string> = new Set();
  const listeners = new Set<() => void>();
  function publish(next: ReadonlySet<string>) {
    entries = next;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => entries,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async hydrate() {
      if (!storage) return;
      try {
        const saved: unknown = JSON.parse(
          (await storage.getItem(FAVOURITE_MERCHANTS_KEY)) ?? '[]',
        );
        if (!Array.isArray(saved)) return;
        publish(
          new Set([
            ...entries,
            ...saved.filter((item): item is string => typeof item === 'string'),
          ]),
        );
      } catch {
        // Unreadable storage only loses stars.
      }
    },
    toggle(owner: string, merchantKey: string) {
      const entry = `${owner}|${merchantKey}`;
      const next = new Set(entries);
      if (next.has(entry)) next.delete(entry);
      else next.add(entry);
      publish(next);
      void storage
        ?.setItem(FAVOURITE_MERCHANTS_KEY, JSON.stringify([...next]))
        .catch(() => undefined);
    },
  };
}

/** The merchant keys one owner has starred. */
export function favouritesFor(entries: ReadonlySet<string>, owner: string) {
  const prefix = `${owner}|`;
  return new Set(
    [...entries]
      .filter((entry) => entry.startsWith(prefix))
      .map((entry) => entry.slice(prefix.length)),
  );
}
