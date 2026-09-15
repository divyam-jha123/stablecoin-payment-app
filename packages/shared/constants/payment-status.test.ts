import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition, PAYMENT_STATUSES } from './payment-status.js';

describe('payment state guards', () => {
  it('allows the verified and settled happy path', () => {
    const path = ['CREATED', 'QUOTED', 'AWAITING_SIGNATURE', 'ONCHAIN_PENDING', 'ONCHAIN_CONFIRMED', 'SETTLEMENT_PENDING', 'PAYOUT_PENDING', 'COMPLETED'] as const;
    for (let i = 1; i < path.length; i++) {
      expect(canTransition(path[i - 1]!, path[i]!)).toBe(true);
    }
  });

  it('cannot skip verification or payout', () => {
    expect(() => assertTransition('ONCHAIN_PENDING', 'COMPLETED')).toThrow();
    expect(canTransition('ONCHAIN_PENDING', 'SETTLEMENT_PENDING')).toBe(false);
    expect(canTransition('ONCHAIN_CONFIRMED', 'COMPLETED')).toBe(false);
  });

  it('does not expire/cancel transactions that may already be included', () => {
    expect(canTransition('ONCHAIN_PENDING', 'EXPIRED')).toBe(false);
    expect(canTransition('ONCHAIN_PENDING', 'CANCELLED')).toBe(false);
  });

  it.each(['COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'] as const)('%s is terminal', (status) => {
    for (const next of PAYMENT_STATUSES) expect(canTransition(status, next)).toBe(false);
  });

  it('can retry downstream failures without authorizing another charge', () => {
    expect(canTransition('PAYOUT_FAILED', 'PAYOUT_PENDING')).toBe(true);
    expect(canTransition('SETTLEMENT_FAILED', 'SETTLEMENT_PENDING')).toBe(true);
    expect(canTransition('PAYOUT_FAILED', 'AWAITING_SIGNATURE')).toBe(false);
  });
});
