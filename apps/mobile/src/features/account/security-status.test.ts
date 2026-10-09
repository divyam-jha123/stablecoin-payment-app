import { describe, expect, it } from 'vitest';
import { securitySummary } from './security-status';

describe('security summary', () => {
  it('waits for every check before calling the account secure', () => {
    expect(securitySummary({ hasPin: null, phoneLock: true }).state).toBe(
      'loading',
    );
    expect(securitySummary({ hasPin: true, phoneLock: null }).state).toBe(
      'loading',
    );
  });

  it('asks for a payment PIN first, then a phone screen lock', () => {
    expect(securitySummary({ hasPin: false, phoneLock: false }).state).toBe(
      'missing-pin',
    );
    expect(securitySummary({ hasPin: true, phoneLock: false }).state).toBe(
      'missing-lock',
    );
  });

  it('is secure only with a PIN and a phone lock', () => {
    expect(securitySummary({ hasPin: true, phoneLock: true })).toEqual({
      state: 'secure',
      title: 'Your account is secure',
      subtitle: 'Payment PIN and app lock are active',
    });
  });
});
