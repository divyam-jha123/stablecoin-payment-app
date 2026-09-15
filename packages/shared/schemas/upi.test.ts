import { describe, expect, it } from 'vitest';
import { parseUpiPaymentDraft, parseUpiQr } from './upi.js';

const base = 'upi://pay?pa=merchant@upi&pn=Coffee%20Shop';

describe('UPI QR parsing', () => {
  it('parses the requested standard merchant QR', () => {
    expect(parseUpiQr(`${base}&am=250&cu=INR`)).toEqual({
      vpa: 'merchant@upi',
      merchantName: 'Coffee Shop',
      amount: 250,
      currency: 'INR',
    });
  });

  it('allows missing amount for manual entry, and defaults missing currency to INR', () => {
    expect(parseUpiQr(base)).toEqual({
      vpa: 'merchant@upi', merchantName: 'Coffee Shop', currency: 'INR',
    });
  });

  it('preserves exact input decimals for payment creation', () => {
    expect(parseUpiPaymentDraft(`${base}&am=0.29`).inrAmount).toBe('0.29');
    expect(parseUpiQr(`${base}&am=0.01`).amount).toBe(0.01);
  });

  it('uses the VPA as a transparent fallback when the name is absent', () => {
    expect(parseUpiQr('upi://pay?pa=merchant@upi').merchantName).toBe('merchant@upi');
  });

  it('allows additional ordinary UPI metadata without treating it as instructions', () => {
    expect(parseUpiQr(`${base}&tr=invoice123&tn=coffee&mc=5812`).vpa).toBe('merchant@upi');
  });

  it('decodes unicode and plus-encoded spaces in merchant names', () => {
    expect(parseUpiQr('upi://pay?pa=shop@bank&pn=Coffee+Shop').merchantName).toBe('Coffee Shop');
    expect(parseUpiQr(`upi://pay?pa=shop@bank&pn=${encodeURIComponent('चाय')}`).merchantName).toBe('चाय');
  });

  it.each([
    '', 'hello', 'https://pay?pa=merchant@upi', 'upi://collect?pa=merchant@upi',
    'upi://pay/path?pa=merchant@upi', 'upi://user@pay?pa=merchant@upi',
    'upi://pay:123?pa=merchant@upi', `${base}#fragment`,
    'upi://pay?pn=Shop', 'upi://pay?pa=bad-address',
    'upi://pay?pa=a@b@c', 'upi://pay?pa=shop%20name@upi',
    `${base}&pa=attacker@bank`, `${base}&pn=Another`,
    `${base}&am=1&am=2`, `${base}&cu=INR&cu=USD`,
    `${base}&cu=USD`, `${base}&cu=inr`, `${base}&cu=`,
    'upi://pay?pa=shop@bank&pn=', 'upi://pay?pa=shop@bank&pn=%20',
    'upi://pay?pa=shop@bank&pn=%ZZ', 'upi://pay?pa=shop@bank&pn=%E0%A4',
    'upi://pay?pa=shop@bank&pn=%00', 'upi://pay?pa=shop@bank&pn=%E2%80%AEshop',
    `${base}\n`, ` ${base}`, `${base}&tn=${'x'.repeat(4096)}`,
  ])('rejects malformed or ambiguous QR: %s', (input) => {
    expect(() => parseUpiQr(input)).toThrow();
  });

  it.each(['', '0', '0.00', '-1', '+1', '1e3', 'Infinity', 'NaN', '1,000', '1.001', '.50', '1.', '01', ' 1', '1000000000'])('rejects invalid amount %s', (amount) => {
    expect(() => parseUpiQr(`${base}&am=${encodeURIComponent(amount)}`)).toThrow();
  });
});
