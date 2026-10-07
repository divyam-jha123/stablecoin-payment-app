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
  return `₹${amount.toLocaleString('en-IN')}`;
}

const sent = previewTransactions.filter(
  (transaction) => transaction.direction === 'Sent',
);

export const previewDashboard = {
  balance: '148.32',
  displayBalance: '₹12,450.75',
  displayEquivalent: '≈ 148.32 USDC',
  spent: previewInr(
    sent.reduce((total, transaction) => total + transaction.amount, 0),
  ),
  payments: sent.length,
  networkFees: '0.004',
};
