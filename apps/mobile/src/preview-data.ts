import {
  simulatedBalance,
  toTransactionItem,
  type SimulatedPayment,
  type TransactionItem,
} from './features/payment/simulated-payments';

/** Illustrative fixtures for the explicitly enabled local UI preview only. */
export const previewTransactions = [
  {
    id: 'coffee',
    name: 'Starbucks',
    category: 'Coffee & Beverages',
    direction: 'Sent',
    amount: 480,
    time: 'Today · 11:24 AM',
  },
  {
    id: 'ride',
    name: 'Blinkit',
    category: 'Online Shopping',
    direction: 'Sent',
    amount: 320,
    time: 'Today · 9:12 AM',
  },
  {
    id: 'topup',
    name: 'Received from Priya',
    category: 'UPI Transfer',
    direction: 'Received',
    amount: 1000,
    time: 'Today · 7:45 AM',
  },
  {
    id: 'hotel',
    name: 'Taj Hotel',
    category: 'Travel',
    direction: 'Sent',
    amount: 4500,
    time: 'Yesterday · 3:20 PM',
  },
  {
    id: 'mobile',
    name: 'Airtel Recharge',
    category: 'Bills',
    direction: 'Sent',
    amount: 299,
    time: 'Yesterday · 11:05 AM',
  },
] as const;

export type PreviewTransaction = (typeof previewTransactions)[number];

export function previewInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const sent = previewTransactions.filter(
  (transaction) => transaction.direction === 'Sent',
);

const previewInrBalance = 12450.75;

export const previewDashboard = {
  balance: '148.32',
  displayBalance: previewInr(previewInrBalance),
  displayEquivalent: '≈ 148.32 USDC',
  spent: previewInr(
    sent.reduce((total, transaction) => total + transaction.amount, 0),
  ),
  payments: sent.length,
  networkFees: '0.004',
};

/** Shown on the success screen when it is opened directly in the UI preview. */
export const previewSamplePayment: SimulatedPayment = {
  id: 'preview-sample',
  reference: 'TRV000000480001',
  address: null,
  merchantName: 'Starbucks',
  location: 'Pune, Maharashtra',
  inrAmount: '480',
  token: 'USDC',
  createdAt: Date.now(),
};

/**
 * The sample dashboard after simulated preview payments. Payments come off
 * the sample balance and join the sample activity; no funds move.
 */
export function previewDashboardWith(payments: readonly SimulatedPayment[]) {
  const simulatedSpent = payments.reduce(
    (total, payment) => total + Number(payment.inrAmount),
    0,
  );
  const sentTotal = sent.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const transactions: TransactionItem[] = [
    ...payments.map(toTransactionItem),
    ...previewTransactions,
  ];
  return {
    ...previewDashboard,
    displayBalance: previewInr(Math.max(0, previewInrBalance - simulatedSpent)),
    displayEquivalent: `≈ ${Number(
      simulatedBalance(previewDashboard.balance, payments),
    ).toFixed(2)} USDC`,
    spent: previewInr(sentTotal + simulatedSpent),
    payments: sent.length + payments.length,
    transactions,
  };
}
