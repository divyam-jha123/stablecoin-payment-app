import { describe, expect, it } from 'vitest';
import { MockPayoutProvider } from './payout/mock.js';
import { MockFiatSettlementProvider } from './settlement/mock.js';
import { UnconfiguredTempoProvider } from './tempo/provider.js';

const paymentId = '12735a5e-6ed2-4f35-8031-65f6dc3a1767';
const input = { paymentId, idempotencyKey: 'payout-one', merchantVpa: 'shop@upi', inrAmount: '250.00' };

describe('isolated provider scaffold', () => {
  it('does not invent Tempo balances or verification success', async () => {
    const provider = new UnconfiguredTempoProvider();
    await expect(provider.getBalance()).rejects.toThrow('not configured');
    await expect(provider.verifyPayment()).rejects.toThrow('not implemented');
  });

  it('replays concurrent matching mock payout calls and labels simulation', async () => {
    const provider = new MockPayoutProvider();
    const [first, second] = await Promise.all([provider.createPayout(input), provider.createPayout(input)]);
    expect(first).toEqual(second);
    expect(first.simulated).toBe(true);
    expect(first.mode).toBe('mock');
    await expect(provider.getPayoutStatus(first.id)).resolves.toBe('SUCCEEDED');
    await expect(provider.getPayoutStatus('unknown')).rejects.toThrow();
  });

  it('rejects changed payout amount, new key for the same payment and reused key for another payment', async () => {
    const provider = new MockPayoutProvider();
    await provider.createPayout(input);
    await expect(provider.createPayout({ ...input, inrAmount: '999' })).rejects.toThrow('conflict');
    await expect(provider.createPayout({ ...input, idempotencyKey: 'another' })).rejects.toThrow('conflict');
    await expect(provider.createPayout({ ...input, paymentId: '41735a5e-6ed2-4f35-8031-65f6dc3a1767' })).rejects.toThrow('already used');
  });

  it('does not allow callers to mutate stored mock payout status', async () => {
    const provider = new MockPayoutProvider();
    const result = await provider.createPayout(input);
    result.status = 'FAILED';
    await expect(provider.getPayoutStatus(result.id)).resolves.toBe('SUCCEEDED');
  });

  it('validates mock payouts and never accepts negative INR', async () => {
    await expect(new MockPayoutProvider().createPayout({ ...input, inrAmount: '-1' })).rejects.toThrow();
  });

  it('replays mock conversion with no second operation and rejects changed amounts', async () => {
    const provider = new MockFiatSettlementProvider();
    const request = { paymentId, idempotencyKey: 'settlement-one', sourceAmountAtomic: '3000000', inrAmount: '250.00' };
    const first = await provider.initiateSettlement(request);
    expect(await provider.initiateSettlement(request)).toEqual(first);
    expect(first.simulated).toBe(true);
    await expect(provider.initiateSettlement({ ...request, sourceAmountAtomic: '4000000' })).rejects.toThrow('conflict');
  });
});
