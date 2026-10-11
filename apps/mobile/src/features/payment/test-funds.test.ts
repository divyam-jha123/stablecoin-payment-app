import { describe, expect, it } from 'vitest';
import type { SimulatedPayment } from './simulated-payments';
import { testFundsCheck } from './test-funds';

const simulated: SimulatedPayment = {
  id: '1',
  reference: 'TRV1',
  address: '0xabc',
  merchantName: 'Cafe',
  location: 'Pune',
  inrAmount: '830',
  token: 'USDC',
  createdAt: 0,
};

describe('test funds check', () => {
  it('allows a payment the balance covers exactly', () => {
    expect(testFundsCheck('10', [], '830')).toEqual({
      spendable: '10',
      required: '10',
      enough: true,
    });
  });
  it('blocks a payment above the balance', () => {
    expect(testFundsCheck('9.99', [], '830').enough).toBe(false);
    expect(testFundsCheck('0', [], '1').enough).toBe(false);
  });
  it('takes simulated payments off the balance first', () => {
    expect(testFundsCheck('15', [simulated], '830')).toMatchObject({
      spendable: '5',
      enough: false,
    });
  });
  it('ignores payments already settled on chain', () => {
    expect(
      testFundsCheck('15', [{ ...simulated, txHash: '0x1' }], '830').enough,
    ).toBe(true);
  });
});
