import { vpaSchema } from '@traveller/shared';
import type { Recipient } from '../payment/simulated-payments';

const MAX_QUERY = 120;

/** Trimmed, lower-cased search text, capped so pasted junk stays cheap. */
export function normalizeQuery(query: string) {
  return query.trim().slice(0, MAX_QUERY).toLowerCase();
}

/** A UPI ID typed or spoken into search, or null when it is not one. */
export function upiIdFromQuery(query: string): string | null {
  // Speech often renders "@" as " at " and adds spaces inside the ID.
  const candidate = query
    .trim()
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s+/g, '')
    .toLowerCase();
  const result = vpaSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

/**
 * People and merchants paid before whose name or UPI ID matches every word
 * of the query. Names starting with the query rank first.
 */
export function searchRecipients(
  recipients: readonly Recipient[],
  query: string,
): Recipient[] {
  const text = normalizeQuery(query);
  if (!text) return [];
  const words = text.split(/\s+/);
  return recipients
    .map((recipient) => {
      const name = recipient.name.toLowerCase();
      const haystack = `${name} ${recipient.vpa?.toLowerCase() ?? ''}`;
      if (!words.every((word) => haystack.includes(word))) return null;
      return { recipient, rank: name.startsWith(text) ? 0 : 1 };
    })
    .filter((match) => match !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((match) => match.recipient);
}

export type SearchPage = {
  title: string;
  detail: string;
  href:
    | '/home'
    | '/activity'
    | '/payments'
    | '/scanner'
    | '/receive'
    | '/add-money'
    | '/profile'
    | '/edit-profile'
    | '/payment-methods'
    | '/setup-payments'
    | '/security'
    | '/login-activity'
    | '/notifications'
    | '/theme'
    | '/help'
    | '/support-chat'
    | '/terms';
  /** Extra words people might search for this page. */
  keywords: string;
};

/** App screens search can open. */
export const searchPages: readonly SearchPage[] = [
  {
    title: 'Home',
    detail: 'Balance and quick actions',
    href: '/home',
    keywords: 'dashboard balance spending power main',
  },
  {
    title: 'Activity',
    detail: 'All your transactions',
    href: '/activity',
    keywords: 'history transactions statement sent received spends',
  },
  {
    title: 'Payments',
    detail: 'Pay a UPI ID or merchant',
    href: '/payments',
    keywords: 'pay send upi id transfer money',
  },
  {
    title: 'Scan UPI QR',
    detail: 'Pay any UPI QR code',
    href: '/scanner',
    keywords: 'scan qr camera pay merchant shop',
  },
  {
    title: 'Receive Payout',
    detail: 'Show your QR to get paid',
    href: '/receive',
    keywords: 'receive get paid my qr request money collect',
  },
  {
    title: 'Top Up',
    detail: 'Add money to your wallet',
    href: '/add-money',
    keywords: 'add money top up fund deposit load',
  },
  {
    title: 'Profile',
    detail: 'Your account and wallet',
    href: '/profile',
    keywords: 'account me wallet metamask settings',
  },
  {
    title: 'Edit profile',
    detail: 'Name, photo and personal details',
    href: '/edit-profile',
    keywords: 'personal details name photo avatar email phone',
  },
  {
    title: 'Payment methods',
    detail: 'Cards and accounts',
    href: '/payment-methods',
    keywords: 'card bank account methods',
  },
  {
    title: 'Tap to Pay',
    detail: 'Daily limit and setup',
    href: '/setup-payments',
    keywords: 'tap nfc contactless limit setup',
  },
  {
    title: 'Security',
    detail: 'PIN, app lock and biometrics',
    href: '/security',
    keywords: 'pin password app lock face id fingerprint biometric privacy',
  },
  {
    title: 'Login activity',
    detail: 'Devices and sign-ins',
    href: '/login-activity',
    keywords: 'devices sessions sign in login',
  },
  {
    title: 'Notifications',
    detail: 'Alerts and updates',
    href: '/notifications',
    keywords: 'alerts bell updates messages',
  },
  {
    title: 'Theme',
    detail: 'Light or dark appearance',
    href: '/theme',
    keywords: 'dark mode light appearance display',
  },
  {
    title: 'Help',
    detail: 'FAQs and support',
    href: '/help',
    keywords: 'faq support questions problem',
  },
  {
    title: 'Support chat',
    detail: 'Chat with TravelPe support',
    href: '/support-chat',
    keywords: 'chat contact support agent talk',
  },
  {
    title: 'Terms & privacy',
    detail: 'Terms of service and privacy policy',
    href: '/terms',
    keywords: 'terms privacy policy legal',
  },
];

function matchesWords(haystack: string, text: string) {
  return text.split(/\s+/).every((word) => haystack.includes(word));
}

/** Pages whose title or keywords match every word; title prefixes first. */
export function searchPagesFor(
  pages: readonly SearchPage[],
  query: string,
): SearchPage[] {
  const text = normalizeQuery(query);
  if (!text) return [];
  return pages
    .filter((page) =>
      matchesWords(
        `${page.title} ${page.detail} ${page.keywords}`.toLowerCase(),
        text,
      ),
    )
    .sort(
      (a, b) =>
        Number(!a.title.toLowerCase().startsWith(text)) -
        Number(!b.title.toLowerCase().startsWith(text)),
    );
}

/** Transactions whose name, category, direction or amount match. */
export function searchTransactions<
  T extends {
    name: string;
    category: string;
    direction: string;
    amount: number;
  },
>(
  transactions: readonly T[],
  query: string,
  formatAmount: (amount: number) => string,
): T[] {
  const text = normalizeQuery(query);
  if (!text) return [];
  return transactions.filter((transaction) =>
    matchesWords(
      `${transaction.name} ${transaction.category} ${transaction.direction} ${transaction.amount} ${formatAmount(transaction.amount)}`.toLowerCase(),
      text,
    ),
  );
}
