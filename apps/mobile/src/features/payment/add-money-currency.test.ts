import { describe, expect, it } from 'vitest';
import {
  addMoneyCurrency,
  addMoneyRate,
  addMoneyReceive,
} from './add-money-currency';

describe('add money currency', () => {
  it('reads the currency param safely', () => {
    expect(addMoneyCurrency('USDT')).toBe('USDT');
    expect(addMoneyCurrency('INR')).toBe('INR');
    expect(addMoneyCurrency('ETH')).toBe('USDC');
    expect(addMoneyCurrency(undefined)).toBe('USDC');
  });

  it('converts rupees into the chosen currency', () => {
    expect(addMoneyReceive(1000, 'USDC')).toBe('12.05 USDC');
    expect(addMoneyReceive(1000, 'USDT')).toBe('12.05 USDT');
    expect(addMoneyReceive(1000, 'INR')).toBe('₹1,000');
    expect(addMoneyReceive(Number.NaN, 'USDT')).toBe('0.00 USDT');
  });

  it('describes the rate', () => {
    expect(addMoneyRate('USDT')).toBe('1 USDT ≈ ₹83.00');
    expect(addMoneyRate('INR')).toBe('No conversion · added as Indian Rupees');
  });
});
