import {
  simulatedBalance,
  toTransactionItem,
  type SimulatedPayment,
  type TransactionItem,
} from './features/payment/simulated-payments';
import type { LoginActivityEntry } from './features/account/login-activity';

/** Illustrative fixtures for the explicitly enabled local UI preview only. */
export const previewTransactions: readonly TransactionItem[] = [
  {
    id: 'coffee',
    name: 'Starbucks',
    category: 'Cafe & Beverages',
    direction: 'Sent',
    amount: 480,
    time: 'Today · 11:24 AM',
    token: 'USDC',
    brand: { mark: 'S', background: '#00704A', color: '#ffffff' },
  },
  {
    id: 'grocery',
    name: 'Blinkit',
    category: 'Online Shopping',
    direction: 'Sent',
    amount: 320,
    time: 'Today · 09:12 AM',
    token: 'USDC',
    brand: { mark: 'blinkit', background: '#F8CB46', color: '#0c831f' },
  },
  {
    id: 'topup',
    name: 'Received from Archita',
    category: 'UPI Transfer',
    direction: 'Received',
    amount: 1000,
    time: 'Today · 07:45 AM',
    token: 'USDC',
  },
  {
    id: 'ride',
    name: 'Uber',
    category: 'Transport',
    direction: 'Sent',
    amount: 250,
    time: 'Yesterday · 10:18 PM',
    token: 'USDC',
    brand: { mark: 'Uber', background: '#000000', color: '#ffffff' },
  },
  {
    id: 'dinner',
    name: 'Zomato',
    category: 'Food & Dining',
    direction: 'Sent',
    amount: 640,
    time: 'Yesterday · 08:11 PM',
    token: 'USDC',
    brand: { mark: 'zomato', background: '#E23744', color: '#ffffff' },
  },
];

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

/** Sample tap-to-pay state for the Profile card in the UI preview. */
export const previewTapToPay = {
  dailyLimitUsd: 250,
  remainingUsd: '238.42',
  expiry: Math.floor(Date.now() / 1000) + 12 * 86_400,
};

/** Sample Security settings for the UI preview; wallet mode reads the phone. */
export const previewSecurity = {
  biometrics: true,
};

/** Sample phone and sign-in history for Login Activity in the UI preview. */
export const previewLoginDevice = {
  name: 'iPhone 18 Pro',
  detail: 'Pune, India',
};

const previewMinute = 60_000;
const previewNow = Date.now();
export const previewLoginActivity: readonly LoginActivityEntry[] = (
  [
    ['unlock', 2],
    ['unlock', 3 * 60],
    ['pin-changed', 26 * 60],
    ['sign-in', 27 * 60],
    ['sign-out', 27 * 60 + 5],
    ['unlock', 3 * 24 * 60],
    ['pin-set', 6 * 24 * 60],
    ['sign-in', 6 * 24 * 60 + 2],
  ] as const
).map(([kind, minutesAgo], index) => ({
  id: `preview-${index}`,
  kind,
  at: previewNow - minutesAgo * previewMinute,
  device: previewLoginDevice.name,
  detail: previewLoginDevice.detail,
}));

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
