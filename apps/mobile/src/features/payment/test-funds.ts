import {
  formatPathUsdAtomic,
  pathUsdBalanceAtomic,
  requiredPathUsdAtomic,
} from './amount';
import { simulatedBalance, type SimulatedPayment } from './simulated-payments';

export const NOT_ENOUGH_TEST_FUNDS =
  'Not enough test funds for this payment. Add test funds from Home, then try again. No funds were moved.';

/**
 * Whether the wallet's pathUSD test funds cover an INR payment. Simulated
 * payments are taken off the on-chain balance first, as on Home.
 */
export function testFundsCheck(
  balance: string,
  payments: readonly SimulatedPayment[],
  inrAmount: string,
) {
  const spendableAtomic = pathUsdBalanceAtomic(
    simulatedBalance(balance, payments),
  );
  const requiredAtomic = requiredPathUsdAtomic(inrAmount);
  return {
    spendable: formatPathUsdAtomic(spendableAtomic),
    required: formatPathUsdAtomic(requiredAtomic),
    enough: spendableAtomic >= requiredAtomic,
  };
}
