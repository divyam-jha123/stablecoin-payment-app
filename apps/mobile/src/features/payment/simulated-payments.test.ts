import { describe, expect, it } from 'vitest';
import {
  formatPaymentTime,
  createSimulatedPaymentStore,
  paymentsForAddress,
  recentRecipients,
  recipientPayments,
  SIMULATED_PAYMENTS_KEY,
  simulatedBalance,
  toTransactionItem,
  type PaymentStorage,
} from './simulated-payments';

const payment = {
  address: '0xABC',
  merchantName: 'Starbucks',
  location: 'Pune, Maharashtra',
  inrAmount: '830',
  token: 'USDC',
};

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: PaymentStorage = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
}

describe('simulated payments', () => {
  it('records payments newest first and finds them by id', () => {
    const store = createSimulatedPaymentStore();
    const first = store.record(payment);
    const second = store.record({ ...payment, inrAmount: '83' });
    expect(store.getSnapshot()).toEqual([second, first]);
    expect(store.get(first.id)).toBe(first);
    expect(store.get('missing')).toBeUndefined();
    expect(first.reference).toMatch(/^TRV\d{12}$/);
  });

  it('notifies subscribers when a payment is recorded', () => {
    const store = createSimulatedPaymentStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.record(payment);
    unsubscribe();
    store.record(payment);
    expect(calls).toBe(1);
  });

  it('saves payments and restores them in a new store', async () => {
    const { storage, items } = memoryStorage();
    const saved = createSimulatedPaymentStore(storage).record(payment);
    await Promise.resolve();
    expect(items.has(SIMULATED_PAYMENTS_KEY)).toBe(true);

    const restored = createSimulatedPaymentStore(storage);
    await restored.hydrate();
    expect(restored.getSnapshot()).toEqual([saved]);
  });

  it('resets preview history while preserving wallet payment records', async () => {
    const { storage } = memoryStorage();
    const store = createSimulatedPaymentStore(storage);
    const walletPayment = store.record(payment);
    store.record({ ...payment, address: null });

    await store.clearPreview();
    expect(store.getSnapshot()).toEqual([walletPayment]);

    const restored = createSimulatedPaymentStore(storage);
    await restored.hydrate();
    expect(restored.getSnapshot()).toEqual([walletPayment]);
  });

  it('keeps payments recorded before hydration and ignores bad data', async () => {
    const { storage } = memoryStorage({
      [SIMULATED_PAYMENTS_KEY]: JSON.stringify([{ id: 'broken' }]),
    });
    const store = createSimulatedPaymentStore(storage);
    const fresh = store.record(payment);
    await store.hydrate();
    expect(store.getSnapshot()).toEqual([fresh]);

    const corrupt = createSimulatedPaymentStore(
      memoryStorage({ [SIMULATED_PAYMENTS_KEY]: 'not json' }).storage,
    );
    await corrupt.hydrate();
    expect(corrupt.getSnapshot()).toEqual([]);
  });

  it('filters payments by wallet address case-insensitively', () => {
    const store = createSimulatedPaymentStore();
    const mine = store.record(payment);
    store.record({ ...payment, address: '0xdef' });
    expect(paymentsForAddress(store.getSnapshot(), '0xabc')).toEqual([mine]);
  });

  it('deducts simulated spend from the balance and clamps at zero', () => {
    const store = createSimulatedPaymentStore();
    store.record(payment);
    expect(simulatedBalance('25.5', store.getSnapshot())).toBe('15.5');
    expect(simulatedBalance('4', store.getSnapshot())).toBe('0');
    expect(simulatedBalance('4', [])).toBe('4');
  });

  it('does not deduct on-chain payments, which the balance already shows', () => {
    const store = createSimulatedPaymentStore();
    const onChain = store.record({ ...payment, txHash: '0xfeed' });
    expect(onChain.txHash).toBe('0xfeed');
    expect(simulatedBalance('25.5', store.getSnapshot())).toBe('25.5');
  });

  it('maps a payment to a sent transaction item', () => {
    const store = createSimulatedPaymentStore();
    const item = toTransactionItem(store.record(payment));
    expect(item).toMatchObject({
      name: 'Starbucks',
      direction: 'Sent',
      amount: 830,
    });
  });
});

describe('formatPaymentTime', () => {
  it('labels today and yesterday, then falls back to the date', () => {
    const now = new Date(2026, 9, 9, 12, 0).getTime();
    expect(
      formatPaymentTime(new Date(2026, 9, 9, 9, 5).getTime(), now),
    ).toMatch(/^Today · /);
    expect(
      formatPaymentTime(new Date(2026, 9, 8, 22, 18).getTime(), now),
    ).toMatch(/^Yesterday · /);
    expect(
      formatPaymentTime(new Date(2026, 9, 6, 8, 0).getTime(), now),
    ).not.toMatch(/^(Today|Yesterday)/);
  });

  it('lists recent recipients newest first without repeats', () => {
    const store = createSimulatedPaymentStore();
    expect(recentRecipients(store.getSnapshot())).toEqual([]);
    store.record({ ...payment, now: 1 });
    store.record({ ...payment, merchantName: 'Cafe Lotus', now: 2 });
    store.record({ ...payment, merchantName: ' starbucks ', now: 3 });
    expect(
      recentRecipients(store.getSnapshot()).map((recipient) => recipient.name),
    ).toEqual(['starbucks', 'Cafe Lotus']);
  });

  it('keeps a valid merchant UPI ID and groups history by it', () => {
    const store = createSimulatedPaymentStore();
    const first = store.record({
      ...payment,
      merchantVpa: 'cafelotus@upi',
      merchantName: 'Cafe Lotus',
      now: 1,
    });
    store.record({
      ...payment,
      merchantVpa: 'cafelotus@upi',
      merchantName: 'Café Lotus',
      now: 2,
    });
    const invalid = store.record({ ...payment, merchantVpa: 'not a vpa' });
    expect(first.merchantVpa).toBe('cafelotus@upi');
    expect(invalid.merchantVpa).toBeUndefined();
    const recipients = recentRecipients(store.getSnapshot());
    expect(recipients[1]).toMatchObject({
      name: 'Café Lotus',
      vpa: 'cafelotus@upi',
    });
    expect(
      recipientPayments(store.getSnapshot(), recipients[1]!).map(
        (item) => item.createdAt,
      ),
    ).toEqual([1, 2]);
  });
});
