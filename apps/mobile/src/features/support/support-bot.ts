import { FAQS, findFaqs } from './support';

/** A payment the bot can talk about, newest first. */
export type BotPayment = {
  id: string;
  name: string;
  amount: number;
  time: string;
  status: string;
  /** Receipt to open, when the payment has one on this phone. */
  receiptId: string | null;
};

export type BotOptionId =
  'status' | 'security' | 'failed' | 'human' | 'failed-yes' | 'failed-no';

export type BotAction =
  | { label: string; route: '/support-ticket' | '/security' }
  | { label: string; receiptId: string };

export type BotReply = {
  text: string;
  /** Stacked choices under the message, or small pills beside it. */
  options?: { style: 'menu' | 'pills'; items: readonly BotOptionId[] };
  actions?: readonly BotAction[];
};

export const OPTION_LABELS: Record<BotOptionId, string> = {
  status: 'Check transaction status',
  security: 'Security and PIN setup help',
  failed: 'Failed payment help',
  human: 'Talk to a human',
  'failed-yes': 'Yes',
  'failed-no': 'No',
};

/** What the user is shown saying when they pick an option. */
export const OPTION_MESSAGES: Record<BotOptionId, string> = {
  status: 'What is the status of my latest payment?',
  security: 'I need help with security and my PIN.',
  failed: 'I need help with a recent failed payment.',
  human: 'I would like to talk to a human.',
  'failed-yes': 'Yes',
  'failed-no': 'No',
};

const MENU = {
  style: 'menu',
  items: ['status', 'security', 'failed', 'human'],
} as const;

const TICKET: BotAction = {
  label: 'Raise a Support Ticket',
  route: '/support-ticket',
};

export function inr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function receipt(payment: BotPayment): BotAction[] {
  return payment.receiptId
    ? [{ label: 'View receipt', receiptId: payment.receiptId }]
    : [];
}

export function greeting(firstName: string): BotReply {
  return {
    text: `👋 Hello ${firstName}! How can I help you today?`,
    options: MENU,
  };
}

/** The bot's answer to a picked option. */
export function replyToOption(
  option: BotOptionId,
  payments: readonly BotPayment[],
): BotReply {
  const latest = payments[0];
  switch (option) {
    case 'status':
      return latest
        ? {
            text: `Your latest payment was ${inr(latest.amount)} to ${latest.name}, ${latest.time}. ${latest.status}`,
            actions: receipt(latest),
          }
        : { text: 'I can’t find any payments on this phone yet.' };
    case 'security':
      return {
        text: FAQS.find((faq) => faq.id === 'secure-pin')?.answer ?? '',
        actions: [{ label: 'Open Security', route: '/security' }],
      };
    case 'failed':
      return latest
        ? {
            text: `I can help with that! Is it about your payment of ${inr(latest.amount)} to ${latest.name}?`,
            options: { style: 'pills', items: ['failed-yes', 'failed-no'] },
          }
        : {
            text: 'I can’t find any payments on this phone yet. If money left your wallet, raise a support ticket and describe what happened.',
            actions: [TICKET],
          };
    case 'failed-yes':
      return latest
        ? {
            text: `${latest.status} A failed payment is never sent, so no tokens leave your wallet. If your balance still looks wrong, raise a support ticket with this payment attached.`,
            actions: [...receipt(latest), TICKET],
          }
        : replyToOption('failed', payments);
    case 'failed-no':
      return {
        text: 'No problem. Raise a support ticket and choose the payment there, or check Activity for its receipt.',
        actions: [TICKET],
      };
    case 'human':
      return {
        text: 'Our support team isn’t available in chat yet. Raise a support ticket and keep its reference so you can quote it later.',
        actions: [TICKET],
      };
  }
}

/** The bot's answer to a typed message, from the help articles. */
export function replyToText(text: string): BotReply {
  const faq = findFaqs(text, null)[0] ?? findFaqs(longestWord(text), null)[0];
  return faq
    ? { text: faq.answer }
    : {
        text: 'I couldn’t find an answer to that. Try one of these, or raise a support ticket.',
        options: MENU,
        actions: [TICKET],
      };
}

// Lets "receipt?" or "fees please" still find an article.
function longestWord(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .sort((a, b) => b.length - a.length)[0] ?? '\u0000'
  );
}
