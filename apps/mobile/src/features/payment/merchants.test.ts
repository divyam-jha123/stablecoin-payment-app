import { describe, expect, it } from 'vitest';
import {
  createFavouriteMerchantStore,
  FAVOURITE_MERCHANTS_KEY,
  favouritesFor,
  merchantInitials,
  merchantSummaries,
  monthTotal,
  paidDayLabel,
  visibleMerchants,
} from './merchants';
import type { SimulatedPayment } from './simulated-payments';

const now = new Date(2026, 9, 11, 12).getTime();
const day = 86_400_000;

function pay(
  id: string,
  merchantName: string,
  merchantVpa: string | undefined,
  inrAmount: string,
  createdAt: number,
): SimulatedPayment {
  return {
    id,
    reference: `TRV${id}`,
    address: null,
    merchantName,
    ...(merchantVpa ? { merchantVpa } : {}),
    location: 'Pune',
    inrAmount,
    token: 'USDC',
    createdAt,
  };
}

const payments = [
  pay('1', 'Café Lotus', 'cafelotus@upi', '1000', now - 3 * day),
  pay('2', 'Café Lotus', 'cafelotus@upi', '250', now - 60_000),
  pay('3', 'Ravi Kirana', 'ravikirana@upi', '2100', now - day),
  pay('4', 'Amit Auto', undefined, '450', now - 40 * day),
];

describe('merchantSummaries', () => {
  it('groups by UPI ID with totals and the newest payment', () => {
    const [cafe, ravi, amit] = merchantSummaries(payments);
    expect(cafe).toMatchObject({
      key: 'cafelotus@upi',
      total: 1250,
      lastAmount: 250,
      count: 2,
    });
    expect(ravi?.name).toBe('Ravi Kirana');
    expect(amit).toMatchObject({ key: 'name:amit auto', vpa: null });
  });
});

describe('monthTotal', () => {
  it('only counts the current calendar month', () => {
    expect(monthTotal(payments, now)).toBe(3350);
  });
});

describe('visibleMerchants', () => {
  const merchants = merchantSummaries(payments);
  const base = {
    query: '',
    filter: 'all' as const,
    sort: 'recent' as const,
    favourites: new Set<string>(),
    now,
  };

  it('searches by name or UPI ID', () => {
    expect(
      visibleMerchants(merchants, { ...base, query: 'KIRANA' }).map(
        (m) => m.name,
      ),
    ).toEqual(['Ravi Kirana']);
    expect(
      visibleMerchants(merchants, { ...base, query: 'lotus@' }),
    ).toHaveLength(1);
  });

  it('filters recent and favourites', () => {
    expect(
      visibleMerchants(merchants, { ...base, filter: 'recent' }),
    ).toHaveLength(2);
    expect(
      visibleMerchants(merchants, {
        ...base,
        filter: 'favourites',
        favourites: new Set(['name:amit auto']),
      }).map((m) => m.name),
    ).toEqual(['Amit Auto']);
  });

  it('sorts by total and name', () => {
    expect(
      visibleMerchants(merchants, { ...base, sort: 'total' }).map(
        (m) => m.name,
      ),
    ).toEqual(['Ravi Kirana', 'Café Lotus', 'Amit Auto']);
    expect(
      visibleMerchants(merchants, { ...base, sort: 'name' })[0]?.name,
    ).toBe('Amit Auto');
  });
});

describe('labels', () => {
  it('builds initials and day labels', () => {
    expect(merchantInitials(' Café  Lotus ')).toBe('CL');
    expect(merchantInitials('Ujjwal')).toBe('U');
    expect(paidDayLabel(now - 60_000, now)).toBe('Today');
    expect(paidDayLabel(now - day, now)).toBe('Yesterday');
  });
});

describe('favourite store', () => {
  it('keeps stars per owner and persists them', async () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => saved.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    const store = createFavouriteMerchantStore(storage);
    store.toggle('0xabc', 'cafelotus@upi');
    store.toggle('ui-preview', 'ravikirana@upi');
    expect([...favouritesFor(store.getSnapshot(), '0xabc')]).toEqual([
      'cafelotus@upi',
    ]);
    store.toggle('0xabc', 'cafelotus@upi');
    expect(favouritesFor(store.getSnapshot(), '0xabc').size).toBe(0);
    await Promise.resolve();
    const restored = createFavouriteMerchantStore(storage);
    await restored.hydrate();
    expect(saved.has(FAVOURITE_MERCHANTS_KEY)).toBe(true);
    expect([...favouritesFor(restored.getSnapshot(), 'ui-preview')]).toEqual([
      'ravikirana@upi',
    ]);
  });
});
