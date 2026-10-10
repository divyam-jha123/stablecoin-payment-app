import { describe, expect, it } from 'vitest';
import {
  buildNotifications,
  createReadStore,
  groupNotifications,
  notificationTime,
  NOTIFICATIONS_READ_KEY,
  type ReadStorage,
} from './notifications';

const now = new Date(2026, 9, 10, 14, 0).getTime();
const minutes = (n: number) => now - n * 60_000;

function memoryStorage(initial: Record<string, string> = {}): ReadStorage {
  const data = { ...initial };
  return {
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

describe('notifications', () => {
  it('turns payments and sign-ins into notifications, newest first', () => {
    const items = buildNotifications(
      [
        {
          id: 'p1',
          reference: 'TRV1',
          address: null,
          merchantName: 'Sample Merchant',
          location: 'Pune',
          inrAmount: '250',
          token: 'USDC',
          createdAt: minutes(10),
        },
      ],
      [
        {
          id: 'l1',
          kind: 'sign-in',
          at: minutes(60 * 24),
          device: 'iPhone 16',
          detail: 'iOS 26',
        },
        {
          id: 'l2',
          kind: 'unlock',
          at: minutes(5),
          device: 'iPhone 16',
          detail: 'iOS 26',
        },
      ],
    );
    expect(items.map((item) => item.id)).toEqual(['payment:p1', 'login:l1']);
    expect(items[0]).toMatchObject({
      title: 'Payment of ₹250.00 successful',
      body: 'Your payment to Sample Merchant was successful.',
      target: { pathname: '/receipt', id: 'p1' },
    });
    expect(items[1]?.title).toBe('New login detected');
  });

  it('formats times and groups by day', () => {
    expect(notificationTime(minutes(10), now)).toBe('10m ago');
    expect(notificationTime(minutes(120), now)).toBe('2h ago');
    expect(notificationTime(minutes(60 * 20), now)).toBe('Yesterday');
    const groups = groupNotifications(
      buildNotifications(
        [],
        [
          {
            id: 'a',
            kind: 'sign-in',
            at: minutes(30),
            device: 'D',
            detail: '',
          },
          {
            id: 'b',
            kind: 'sign-in',
            at: minutes(60 * 20),
            device: 'D',
            detail: '',
          },
        ],
      ),
      now,
    );
    expect(groups.map((group) => group.day)).toEqual(['Today', 'Yesterday']);
  });

  it('remembers what was read, per owner', async () => {
    const storage = memoryStorage();
    const store = createReadStore(storage);
    expect(store.isRead('0xabc', 'payment:p1')).toBe(false);
    store.markRead('0xabc', ['payment:p1']);
    expect(store.isRead('0xabc', 'payment:p1')).toBe(true);
    expect(store.isRead('0xdef', 'payment:p1')).toBe(false);

    const reloaded = createReadStore(storage);
    await reloaded.hydrate();
    expect(reloaded.isRead('0xabc', 'payment:p1')).toBe(true);
  });

  it('ignores unreadable saved read state', async () => {
    const store = createReadStore(
      memoryStorage({ [NOTIFICATIONS_READ_KEY]: '{"0xabc":"nope"}' }),
    );
    await store.hydrate();
    expect(store.isRead('0xabc', 'x')).toBe(false);
  });
});
