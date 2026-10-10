import { describe, expect, it } from 'vitest';
import {
  APPROVAL_TTL_MS,
  createPaymentApprovals,
  parsePaymentRequest,
} from './payment-authorization';

const params = {
  merchantName: 'Cafe Lotus',
  merchantVpa: 'cafelotus@upi',
  location: 'cafelotus@upi',
  inrAmount: '250',
  token: 'pathUSD',
};
const request = parsePaymentRequest(params)!;

describe('payment approvals', () => {
  it('parses valid payment details and rejects bad ones', () => {
    expect(request).toEqual(params);
    expect(parsePaymentRequest({ ...params, inrAmount: '0' })).toBeNull();
    expect(parsePaymentRequest({ ...params, inrAmount: '-5' })).toBeNull();
    expect(parsePaymentRequest({ ...params, token: 'ETH' })).toBeNull();
    expect(parsePaymentRequest({ ...params, merchantVpa: 'x y' })).toBeNull();
    expect(parsePaymentRequest({ ...params, merchantName: '' })).toBeNull();
  });

  it('pays only with a PIN approval for exactly this payment, once', () => {
    const approvals = createPaymentApprovals();
    expect(approvals.spend(undefined, request)).toBe(false);
    expect(approvals.spend('guessed', request)).toBe(false);
    const id = approvals.grant(request);
    expect(approvals.spend(id, { ...request, inrAmount: '2500' })).toBe(false);
    // A failed attempt also uses it up.
    expect(approvals.spend(id, request)).toBe(false);
    const again = approvals.grant(request);
    expect(approvals.spend(again, request)).toBe(true);
    expect(approvals.spend(again, request)).toBe(false);
  });

  it('expires approvals and keeps only the latest one', () => {
    let time = 0;
    let next = 0;
    const approvals = createPaymentApprovals(
      () => time,
      () => `id-${++next}`,
    );
    const old = approvals.grant(request);
    const latest = approvals.grant(request);
    expect(approvals.spend(old, request)).toBe(false);
    time = APPROVAL_TTL_MS;
    expect(approvals.spend(latest, request)).toBe(false);
  });
});
