import { Share } from 'react-native';
import { formatPathUsdAtomic } from './amount';
import {
  formatPaymentTime,
  paymentPathUsdAtomic,
  type SimulatedPayment,
} from './simulated-payments';

export const SIMULATED_NOTICE =
  'Demo payment on the Tempo testnet. INR settlement is simulated; no INR reached the merchant.';

export function formatInr(amount: string) {
  return Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Opens the share sheet with a plain-text receipt for the payment. */
export function shareReceipt(payment: SimulatedPayment) {
  const lines = [
    'TravelPe payment receipt',
    `Paid ₹${formatInr(payment.inrAmount)} to ${payment.merchantName}`,
    payment.merchantVpa ?? payment.location,
    `Debited: ${formatPathUsdAtomic(paymentPathUsdAtomic(payment))} ${payment.token}`,
    `Reference: ${payment.reference}`,
    ...(payment.txHash ? [`Tempo transaction: ${payment.txHash}`] : []),
    formatPaymentTime(payment.createdAt),
    '',
    SIMULATED_NOTICE,
  ];
  void Share.share({ message: lines.join('\n') }).catch(() => undefined);
}
