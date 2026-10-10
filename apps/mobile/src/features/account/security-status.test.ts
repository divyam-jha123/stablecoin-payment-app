import { describe, expect, it } from 'vitest';
import { securitySummary } from './security-status';

describe('security summary', () => {
  it('waits for every check before calling the account secure', () => {
    expect(
      securitySummary({ hasPin: null, phoneLock: true, appLock: true }).state,
    ).toBe('loading');
    expect(
      securitySummary({ hasPin: true, phoneLock: null, appLock: true }).state,
    ).toBe('loading');
  });

  it('asks for a payment PIN first, then a phone screen lock', () => {
    expect(
      securitySummary({ hasPin: false, phoneLock: false, appLock: true }).state,
    ).toBe('missing-pin');
    expect(
      securitySummary({ hasPin: true, phoneLock: false, appLock: true }).state,
    ).toBe('missing-lock');
  });

  it('waits for the App Lock setting and flags it when off', () => {
    expect(
      securitySummary({ hasPin: true, phoneLock: true, appLock: null }).state,
    ).toBe('loading');
    expect(
      securitySummary({ hasPin: true, phoneLock: true, appLock: false }).state,
    ).toBe('app-lock-off');
  });

  it('is secure only with a PIN and a phone lock', () => {
    expect(
      securitySummary({ hasPin: true, phoneLock: true, appLock: true }),
    ).toEqual({
      state: 'secure',
      title: 'Your account is secure',
      subtitle: 'Payment PIN and app lock are active',
    });
  });
});
