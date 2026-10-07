import { describe, expect, it } from 'vitest';
import {
  formatPathUsdAtomic,
  pathUsdBalanceAtomic,
  requiredPathUsdAtomic,
} from './amount';

describe('payment amount conversion', () => {
  it('rounds the required pathUSD amount upward at token precision', () => {
    expect(requiredPathUsdAtomic('1')).toBe(12_049n);
    expect(formatPathUsdAtomic(requiredPathUsdAtomic('850'))).toBe('10.240964');
  });

  it('compares balances without floating point rounding', () => {
    expect(pathUsdBalanceAtomic('10.240964')).toBe(10_240_964n);
    expect(pathUsdBalanceAtomic('10.240963')).toBeLessThan(
      requiredPathUsdAtomic('850'),
    );
  });

  it('rejects unsupported balance precision', () => {
    expect(() => pathUsdBalanceAtomic('1.0000001')).toThrow(
      'up to 6 decimal places',
    );
  });
});
