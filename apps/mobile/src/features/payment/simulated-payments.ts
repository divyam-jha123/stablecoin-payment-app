import {
  formatPathUsdAtomic,
  pathUsdBalanceAtomic,
  requiredPathUsdAtomic,
} from './amount';

/**
 * Payment records kept on this device. INR settlement is always simulated.
 * Without `txHash` the stablecoin leg is simulated too, and the app deducts it
 * from the displayed test balance; with `txHash` it was a real Tempo testnet
 * transfer, already reflected in the on-chain balance.
 */
export type SimulatedPayment = {
  id: string;
  reference: string;
  address: string | null;
  merchantName: string;
  location: string;
  inrAmount: string;
  token: string;
  createdAt: number;
  /** Tempo transaction that moved the stablecoin, when it was on-chain. */
  txHash?: string;
};

export type TransactionItem = {
  id: string;
  name: string;
  category: string;
  direction: 'Sent' | 'Received';
  amount: number;
  /** Day label, then time, separated by " · " (for example "Today · 9:12 AM"). */
  time: string;
  /** Token debited or credited; the list shows the INR amount in it. */
  token?: string;
  /** Brand mark for sample merchants. Others show their first letter. */
  brand?: { mark: string; background: string; color: string };
};

export interface PaymentStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const SIMULATED_PAYMENTS_KEY = 'traveller.simulated-payments.v1';

function isSimulatedPayment(value: unknown): value is SimulatedPayment {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.reference === 'string' &&
    (record.address === null || typeof record.address === 'string') &&
    typeof record.merchantName === 'string' &&
    typeof record.location === 'string' &&
    typeof record.inrAmount === 'string' &&
    typeof record.token === 'string' &&
    typeof record.createdAt === 'number' &&
    (record.txHash === undefined || typeof record.txHash === 'string')
  );
}

export function createSimulatedPaymentStore(storage?: PaymentStorage) {
  let payments: readonly SimulatedPayment[] = [];
  let sequence = 0;
  const listeners = new Set<() => void>();
  function publish(next: readonly SimulatedPayment[]) {
    payments = next;
    listeners.forEach((listener) => listener());
  }
  function persist() {
    void storage
      ?.setItem(SIMULATED_PAYMENTS_KEY, JSON.stringify(payments))
      .catch(() => undefined);
  }
  return {
    getSnapshot: () => payments,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Loads saved payments, keeping any recorded before loading finished. */
    async hydrate() {
      if (!storage) return;
      try {
        const saved: unknown = JSON.parse(
          (await storage.getItem(SIMULATED_PAYMENTS_KEY)) ?? '[]',
        );
        if (!Array.isArray(saved)) return;
        const known = new Set(payments.map((payment) => payment.id));
        const restored = saved.filter(
          (item): item is SimulatedPayment =>
            isSimulatedPayment(item) && !known.has(item.id),
        );
        if (restored.length) publish([...payments, ...restored]);
      } catch {
        // Unreadable storage only loses demo history.
      }
    },
    record(input: {
      address: string | null | undefined;
      merchantName: string;
      location: string;
      inrAmount: string;
      token: string;
      reference?: string | undefined;
      txHash?: string | undefined;
      now?: number;
    }): SimulatedPayment {
      requiredPathUsdAtomic(input.inrAmount);
      const createdAt = input.now ?? Date.now();
      const digits = `${createdAt}${++sequence}`.slice(-12).padStart(12, '0');
      const payment: SimulatedPayment = {
        id: `sim-${createdAt}-${sequence}`,
        reference: input.reference ?? `TRV${digits}`,
        address: input.address?.toLowerCase() ?? null,
        merchantName: input.merchantName,
        location: input.location,
        inrAmount: input.inrAmount,
        token: input.token,
        createdAt,
        ...(input.txHash ? { txHash: input.txHash } : {}),
      };
      publish([payment, ...payments]);
      persist();
      return payment;
    },
    get: (id: string | undefined) =>
      id ? payments.find((payment) => payment.id === id) : undefined,
  };
}

export function paymentsForAddress(
  payments: readonly SimulatedPayment[],
  address: string | null | undefined,
) {
  const key = address?.toLowerCase() ?? null;
  return payments.filter((payment) => payment.address === key);
}

export function paymentPathUsdAtomic(payment: SimulatedPayment) {
  return requiredPathUsdAtomic(payment.inrAmount);
}

/**
 * On-chain balance minus simulated spend, never below zero. On-chain payments
 * are already in the balance, so only simulated ones are subtracted.
 */
export function simulatedBalance(
  balance: string,
  payments: readonly SimulatedPayment[],
): string {
  const spent = payments.reduce(
    (total, payment) =>
      payment.txHash ? total : total + paymentPathUsdAtomic(payment),
    0n,
  );
  const remaining = pathUsdBalanceAtomic(balance) - spent;
  return formatPathUsdAtomic(remaining > 0n ? remaining : 0n);
}

export function formatPaymentTime(createdAt: number, now = Date.now()) {
  const date = new Date(createdAt);
  const time = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  const day =
    today.toDateString() === date.toDateString()
      ? 'Today'
      : yesterday.toDateString() === date.toDateString()
        ? 'Yesterday'
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${day} · ${time}`;
}

export function toTransactionItem(payment: SimulatedPayment): TransactionItem {
  return {
    id: payment.id,
    name: payment.merchantName,
    category: 'Merchant payment',
    direction: 'Sent',
    amount: Number(payment.inrAmount),
    time: formatPaymentTime(payment.createdAt),
    token: payment.token,
  };
}
