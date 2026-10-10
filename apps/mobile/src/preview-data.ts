import {
  simulatedBalance,
  toTransactionItem,
  type Recipient,
  type SimulatedPayment,
  type TransactionItem,
} from './features/payment/simulated-payments';
import type { LoginActivityEntry } from './features/account/login-activity';
import {
  buildNotifications,
  type AppNotification,
} from './features/notifications/notifications';

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

const previewDay = 86_400_000;

/** Days ago (with hour and minute) and INR amount of each sample payment. */
const previewRecipientHistory: readonly (readonly [
  string,
  string,
  readonly (readonly [number, number, number, string])[],
])[] = [
  [
    'Cafe Lotus',
    'cafelotus@upi',
    [
      [5, 10, 24, '100'],
      [4, 9, 15, '10'],
      [1, 18, 42, '250'],
    ],
  ],
  ['Ujjwal', 'ujjwal@okaxis', [[2, 13, 5, '500']]],
  [
    'Satyam',
    'satyam@ybl',
    [
      [3, 20, 10, '1200'],
      [0, 8, 30, '150'],
    ],
  ],
  ['Aarav', 'aarav@oksbi', [[6, 12, 0, '300']]],
  ['Dinesh', 'dinesh@paytm', [[7, 19, 45, '80']]],
  ['Priya', 'priya@okicici', [[8, 11, 20, '640']]],
  ['Rupesh', 'rupesh@ybl', [[9, 16, 5, '220']]],
  ['Starbucks', 'starbucks@hdfcbank', [[10, 10, 10, '480']]],
  ['Archita', 'archita@okhdfcbank', [[12, 21, 0, '1000']]],
];

function previewTimeAgo(days: number, hours: number, minutes: number) {
  const date = new Date(Date.now() - days * previewDay);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

/** Sample people and merchants for Recent recipients in the UI preview. */
export const previewRecipients: readonly Recipient[] =
  previewRecipientHistory.map(([name, vpa]) => ({
    id: `preview-${vpa}`,
    name,
    vpa,
  }));

/** Sample past payments behind each preview recipient's history. */
export const previewRecipientPayments: readonly SimulatedPayment[] =
  previewRecipientHistory.flatMap(([name, vpa, history]) =>
    history.map(([days, hours, minutes, inrAmount], index) => ({
      id: `preview-${vpa}-${index}`,
      reference: `TRV${String(900000000000 + index * 7919 + days)}`,
      address: null,
      merchantName: name,
      merchantVpa: vpa,
      location: vpa,
      inrAmount,
      token: 'USDC',
      createdAt: previewTimeAgo(days, hours, minutes),
    })),
  );

/** UPI ID and days ago (with hour and minute) of each sample Activity payment. */
const previewActivityHistory: readonly (readonly [
  string,
  string,
  number,
  number,
  number,
])[] = [
  ['coffee', 'starbucks@hdfcbank', 0, 11, 24],
  ['grocery', 'blinkit@ybl', 0, 9, 12],
  ['ride', 'uber@axisbank', 1, 22, 18],
  ['dinner', 'zomato@hdfcbank', 1, 20, 11],
];

/** Sample receipts behind the sent payments in the preview Activity list. */
const previewActivityPayments: readonly SimulatedPayment[] =
  previewActivityHistory.flatMap(([id, vpa, days, hours, minutes], index) => {
    const transaction = previewTransactions.find((item) => item.id === id);
    return transaction
      ? [
          {
            id,
            reference: `TRV${String(910000000000 + index * 6271 + days)}`,
            address: null,
            merchantName: transaction.name,
            merchantVpa: vpa,
            location: vpa,
            inrAmount: String(transaction.amount),
            token: transaction.token ?? 'USDC',
            createdAt: previewTimeAgo(days, hours, minutes),
          },
        ]
      : [];
  });

/** Every sample payment a preview receipt can open. */
export const previewReceiptPayments: readonly SimulatedPayment[] = [
  ...previewRecipientPayments,
  ...previewActivityPayments,
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

/**
 * Sample notifications for the UI preview, built from the same sample
 * payments, sign-ins and activity the other preview screens show, so each one
 * opens matching details. Offers have no real source, so they exist only
 * here. Payments made in the preview are added on top.
 */
export const previewNotifications: readonly AppNotification[] = [
  ...buildNotifications(previewActivityPayments, previewLoginActivity),
  {
    id: 'preview-received-topup',
    kind: 'received',
    title: 'Received ₹1,000.00',
    body: 'From Archita via UPI.',
    at: previewTimeAgo(0, 7, 45),
    target: { pathname: '/activity', filter: 'Received' },
  } satisfies AppNotification,
  {
    id: 'preview-offer',
    kind: 'offer',
    title: 'Get 10% cashback on your next transaction!',
    body: 'Offer valid until end of week.',
    at: previewNow - 2 * 60 * previewMinute,
    target: { pathname: '/scanner' },
  } satisfies AppNotification,
].sort((a, b) => b.at - a.at);

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
