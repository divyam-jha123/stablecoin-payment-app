import { describe, expect, it } from 'vitest';
import { createSimulatedPaymentStore } from './features/payment/simulated-payments';
import {
  previewDashboard,
  previewDashboardWith,
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
