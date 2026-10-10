import type { LoginActivityEntry } from '../account/login-activity';
import type { SimulatedPayment } from '../payment/simulated-payments';

/**
 * In-app notifications, built from what the app already knows: payments made
 * on this phone and wallet sign-ins. Read state is kept on this device.
 */
export type NotificationKind = 'payment' | 'received' | 'offer' | 'security';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Milliseconds since the epoch. */
  at: number;
  /** The screen that shows the details behind it. */
  target?:
    | { pathname: '/receipt'; id: string }
    | { pathname: '/login-activity' }
    | { pathname: '/activity'; filter: 'Received' }
    | { pathname: '/scanner' };
};

export interface ReadStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const NOTIFICATIONS_READ_KEY = 'traveller.notifications-read.v1';
/** Read ids kept per owner, so the list does not grow forever. */
const MAX_READ_IDS = 200;

function formatInr(amount: string | number) {
  return Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Payments and wallet sign-ins as notifications, newest first. */
export function buildNotifications(
  payments: readonly SimulatedPayment[],
  logins: readonly LoginActivityEntry[],
): AppNotification[] {
  const fromPayments = payments.map((payment): AppNotification => ({
    id: `payment:${payment.id}`,
    kind: 'payment',
    title: `Payment of ₹${formatInr(payment.inrAmount)} successful`,
    body: `Your payment to ${payment.merchantName} was successful.`,
    at: payment.createdAt,
    target: { pathname: '/receipt', id: payment.id },
  }));
  const fromLogins = logins
    .filter((entry) => entry.kind === 'sign-in')
    .map((entry): AppNotification => ({
      id: `login:${entry.id}`,
      kind: 'security',
      title: 'New login detected',
      body: `A new login was recorded from ${entry.device}${
        entry.detail ? `, ${entry.detail}` : ''
      }.`,
      at: entry.at,
      target: { pathname: '/login-activity' },
    }));
  return [...fromPayments, ...fromLogins].sort((a, b) => b.at - a.at);
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

function startOfDay(at: number) {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function daysAgo(at: number, now: number) {
  return Math.round((startOfDay(now) - startOfDay(at)) / DAY);
}

/** "Today", "Yesterday" or "12 Oct". */
export function notificationDay(at: number, now: number) {
  const days = daysAgo(at, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(at);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Just now", "10m ago", "2h ago", "Yesterday" or "12 Oct". */
export function notificationTime(at: number, now: number) {
  const gap = Math.max(0, now - at);
  if (gap < MINUTE) return 'Just now';
  if (daysAgo(at, now) <= 0) {
    if (gap < HOUR) return `${Math.floor(gap / MINUTE)}m ago`;
    return `${Math.floor(gap / HOUR)}h ago`;
  }
  return notificationDay(at, now);
}

/** Notifications split into days, keeping their order. */
export function groupNotifications(
  items: readonly AppNotification[],
  now: number,
) {
  const groups: { day: string; items: AppNotification[] }[] = [];
  for (const item of items) {
    const day = notificationDay(item.at, now);
    const group = groups.find((entry) => entry.day === day);
    if (group) group.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

export function createReadStore(storage?: ReadStorage) {
  let read: Readonly<Record<string, readonly string[]>> = {};
  const listeners = new Set<() => void>();
  function publish(next: Readonly<Record<string, readonly string[]>>) {
    read = next;
    listeners.forEach((listener) => listener());
    void storage
      ?.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(read))
      .catch(() => undefined);
  }
  return {
    getSnapshot: () => read,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Loads saved read state, keeping anything marked before it finished. */
    async hydrate() {
      if (!storage) return;
      try {
        const saved: unknown = JSON.parse(
          (await storage.getItem(NOTIFICATIONS_READ_KEY)) ?? '{}',
        );
        if (typeof saved !== 'object' || saved === null) return;
        const merged: Record<string, readonly string[]> = { ...read };
        for (const [owner, ids] of Object.entries(saved)) {
          if (!Array.isArray(ids)) continue;
          const valid = ids.filter(
            (id): id is string => typeof id === 'string',
          );
          merged[owner] = [...new Set([...(merged[owner] ?? []), ...valid])];
        }
        read = merged;
        listeners.forEach((listener) => listener());
      } catch {
        // Unreadable storage only shows old notifications as unread again.
      }
    },
    isRead(owner: string, id: string) {
      return read[owner]?.includes(id) ?? false;
    },
    markRead(owner: string, ids: readonly string[]) {
      const current = read[owner] ?? [];
      const added = ids.filter((id) => !current.includes(id));
      if (!added.length) return;
      publish({
        ...read,
        [owner]: [...added, ...current].slice(0, MAX_READ_IDS),
      });
    },
  };
}
