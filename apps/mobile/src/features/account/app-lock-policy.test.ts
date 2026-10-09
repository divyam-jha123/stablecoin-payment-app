import { describe, expect, it } from 'vitest';
import { RELOCK_AFTER_MS, shouldRelock } from './app-lock-policy';

describe('app lock timing', () => {
  it('re-locks only after 30 seconds or more in the background', () => {
    const away = 1_000_000;
    expect(shouldRelock(null, away)).toBe(false);
    expect(shouldRelock(away, away + 5_000)).toBe(false);
    expect(shouldRelock(away, away + RELOCK_AFTER_MS - 1)).toBe(false);
    expect(shouldRelock(away, away + RELOCK_AFTER_MS)).toBe(true);
    expect(shouldRelock(away, away + 10 * 60_000)).toBe(true);
  });
});
