import { z } from 'zod';

export const PAYMENT_STATUSES = [
  'CREATED',
  'QUOTED',
  'AWAITING_SIGNATURE',
  'ONCHAIN_PENDING',
  'ONCHAIN_CONFIRMED',
  'SETTLEMENT_PENDING',
  'PAYOUT_PENDING',
  'COMPLETED',
  'EXPIRED',
  'FAILED',
  'SETTLEMENT_FAILED',
  'PAYOUT_FAILED',
  'CANCELLED',
] as const;

export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const PAYMENT_TRANSITIONS: Readonly<
  Record<PaymentStatus, readonly PaymentStatus[]>
> = {
  CREATED: ['QUOTED', 'FAILED', 'CANCELLED'],
  QUOTED: ['AWAITING_SIGNATURE', 'EXPIRED', 'FAILED', 'CANCELLED'],
  AWAITING_SIGNATURE: ['ONCHAIN_PENDING', 'EXPIRED', 'FAILED', 'CANCELLED'],
  ONCHAIN_PENDING: ['ONCHAIN_CONFIRMED', 'FAILED'],
  ONCHAIN_CONFIRMED: ['SETTLEMENT_PENDING'],
  SETTLEMENT_PENDING: ['PAYOUT_PENDING', 'SETTLEMENT_FAILED'],
  SETTLEMENT_FAILED: ['SETTLEMENT_PENDING'],
  PAYOUT_PENDING: ['COMPLETED', 'PAYOUT_FAILED'],
  PAYOUT_FAILED: ['PAYOUT_PENDING'],
  COMPLETED: [],
  EXPIRED: [],
  FAILED: [],
  CANCELLED: [],
};

/** Structural guard only. Services must also enforce evidence/ownership guards. */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
  }
}
