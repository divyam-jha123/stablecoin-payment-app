import { describe, expect, it } from 'vitest';
import { createSimulatedPaymentStore } from './features/payment/simulated-payments';
import {
  previewDashboard,
  previewBrand,
  previewDashboardWith,
  previewPaymentsFeed,
  previewRecipientPayments,
  previewTransactions,
} from './preview-data';

describe('preview dashboard', () => {
  it('shows the sample dashboard when no payments were simulated', () => {
    const dashboard = previewDashboardWith([]);
    expect(dashboard.displayBalance).toBe(previewDashboard.displayBalance);
    expect(dashboard.displayEquivalent).toBe(
      previewDashboard.displayEquivalent,
    );
    expect(dashboard.spent).toBe(previewDashboard.spent);
    expect(dashboard.payments).toBe(previewDashboard.payments);
    expect(dashboard.transactions).toEqual([...previewTransactions]);
  });

  it('deducts simulated payments and lists them first', () => {
    const store = createSimulatedPaymentStore();
    const payment = store.record({
      address: null,
      merchantName: 'Starbucks',
      location: 'Pune, Maharashtra',
      inrAmount: '830',
      token: 'USDC',
    });
    const dashboard = previewDashboardWith(store.getSnapshot());
    expect(dashboard.displayBalance).toBe('₹11,620.75');
    expect(dashboard.displayEquivalent).toBe('≈ 138.32 USDC (MetaMask)');
    expect(dashboard.spent).toBe('₹2,520');
    expect(dashboard.payments).toBe(previewDashboard.payments + 1);
    expect(dashboard.transactions[0]?.id).toBe(payment.id);
    expect(dashboard.transactions).toHaveLength(previewTransactions.length + 1);
  });
});

describe('preview payments feed', () => {
  it('mixes people paid in with merchants and money received', () => {
    const feed = previewPaymentsFeed([]);
    const names = feed.map((item) => item.name);
    expect(names).toContain('Satyam');
    expect(names).toContain('Starbucks');
    expect(names).toContain('Received from Archita');
    expect(feed.length).toBeGreaterThan(previewRecipientPayments.length);
  });

  it('keeps sample merchant brands and puts new payments first', () => {
    const store = createSimulatedPaymentStore();
    const payment = store.record({
      address: null,
      merchantName: 'Ujjwal',
      merchantVpa: 'ujjwal@okaxis',
      location: 'ujjwal@okaxis',
      inrAmount: '75',
      token: 'USDC',
    });
    const feed = previewPaymentsFeed([payment]);
    expect(feed[0]?.id).toBe(payment.id);
    expect(feed.find((item) => item.id === 'coffee')?.brand).toBeDefined();
  });
});

describe('preview brand', () => {
  it('gives a sample merchant the same mark as its Recent payments row', () => {
    const row = previewTransactions.find((item) => item.name === 'Starbucks');
    expect(previewBrand('starbucks ')).toEqual(row?.brand);
  });

  it('leaves people without a brand, so they show their initial', () => {
    expect(previewBrand('Satyam')).toBeUndefined();
  });
});
