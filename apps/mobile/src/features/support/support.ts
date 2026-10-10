import { z } from 'zod';

export type HelpTopic = 'payment' | 'security' | 'fees' | 'general';

export type Faq = {
  id: string;
  topic: HelpTopic;
  question: string;
  answer: string;
};

/** Help articles, in the order the Help & Support screen lists them. */
export const FAQS: readonly Faq[] = [
  {
    id: 'failed-debited',
    topic: 'payment',
    question: 'My transaction failed but money debited',
    answer:
      'A failed payment is not sent, so no tokens leave your wallet. If your balance still looks lower, open Activity, find the payment and note its reference, then raise a support ticket with that payment attached.',
  },
  {
    id: 'secure-pin',
    topic: 'security',
    question: 'How do I secure my wallet pin?',
    answer:
      'Set a payment PIN in Profile → Security and turn on biometrics if your phone supports it. Never share your PIN or your MetaMask recovery phrase. TravelPe will never ask for either.',
  },
  {
    id: 'network-fees',
    topic: 'fees',
    question: 'What are network fees and gasless?',
    answer:
      'A network fee is the small charge the Tempo network takes to process a transfer. Tempo takes the fee in a stablecoin, so you do not need a separate gas token. On the testnet, fees are paid in test tokens with no real value.',
  },
  {
    id: 'find-receipt',
    topic: 'payment',
    question: 'Where can I find a payment receipt?',
    answer:
      'Open Activity and tap a payment to see its receipt, including the merchant, amount, token and reference. You can share it from there.',
  },
  {
    id: 'lost-phone',
    topic: 'security',
    question: 'What should I do if I lose my phone?',
    answer:
      'Your funds live in your MetaMask wallet, not in TravelPe. Restore the wallet on a new phone with your recovery phrase, then sign in to TravelPe again.',
  },
  {
    id: 'conversion-rate',
    topic: 'fees',
    question: 'How is the INR amount converted?',
    answer:
      'You enter the amount in INR and TravelPe shows how much of your selected token it will use before you pay. Rates shown on the testnet are illustrative.',
  },
  {
    id: 'which-tokens',
    topic: 'general',
    question: 'Which tokens can I pay with?',
    answer:
      'You can pay with USDC, USDT or pathUSD on the Tempo testnet. Choose the token on the scanner or payment review screen.',
  },
  {
    id: 'real-inr',
    topic: 'general',
    question: 'Does the merchant receive real INR?',
    answer:
      'Not yet. TravelPe runs on the Tempo testnet and INR settlement is simulated, so no real rupees move. Receipts for simulated payments are labelled as demos.',
  },
];

/** How many FAQs the screen shows before a search or topic is chosen. */
export const DEFAULT_FAQ_COUNT = 3;

/** FAQs matching a search and an optional topic. */
export function findFaqs(query: string, topic: HelpTopic | null) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = FAQS.filter(
    (faq) =>
      (!topic || faq.topic === topic) &&
      words.every((word) =>
        `${faq.question} ${faq.answer}`.toLowerCase().includes(word),
      ),
  );
  return words.length || topic ? matches : matches.slice(0, DEFAULT_FAQ_COUNT);
}

export const ISSUE_TYPES = [
  'Transaction Issue',
  'Wallet & Sign-in',
  'Security',
  'Fees & Charges',
  'Privacy & Data',
  'Other',
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

/** Data requests started from Terms & Privacy, prefilled as a ticket. */
export const DATA_REQUESTS = {
  export: {
    title: 'Request My Data',
    description:
      'Please send me a copy of the personal data TravelPe holds about me.',
  },
  delete: {
    title: 'Request Data Deletion',
    description:
      'Please delete my TravelPe account data. I understand that payments recorded on the blockchain cannot be deleted.',
  },
} as const;

export type DataRequest = keyof typeof DATA_REQUESTS;

export function parseDataRequest(value: unknown): DataRequest | null {
  return value === 'export' || value === 'delete' ? value : null;
}

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;

export const supportTicketInput = z.object({
  issueType: z.enum(ISSUE_TYPES),
  transaction: z
    .object({
      id: z.string().min(1).max(120),
      label: z.string().trim().min(1).max(160),
    })
    .nullable(),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, 'Tell us a little more about the issue.')
    .max(DESCRIPTION_MAX, `Keep it under ${DESCRIPTION_MAX} characters.`),
  attachmentUri: z.string().min(1).max(2048).nullable(),
});

export type SupportTicketInput = z.infer<typeof supportTicketInput>;

export type SupportTicket = SupportTicketInput & {
  id: string;
  reference: string;
  owner: string;
  createdAt: number;
};

const supportTicket = supportTicketInput.extend({
  id: z.string(),
  reference: z.string(),
  owner: z.string(),
  createdAt: z.number(),
});

export interface TicketStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const SUPPORT_TICKETS_KEY = 'traveller.support-tickets.v1';
const MAX_TICKETS = 50;

/** A short reference such as TKT-4F7Q2C, without easily confused characters. */
export function ticketReference(random: () => number = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1)
    code += alphabet[Math.floor(random() * alphabet.length)];
  return `TKT-${code}`;
}

/** Support tickets saved on this phone, newest first. */
export function createSupportTicketStore(storage?: TicketStorage) {
  let tickets: readonly SupportTicket[] = [];
  const listeners = new Set<() => void>();
  function publish(next: readonly SupportTicket[]) {
    tickets = next;
    listeners.forEach((listener) => listener());
    void storage
      ?.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(tickets))
      .catch(() => undefined);
  }
  return {
    getSnapshot: () => tickets,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Loads saved tickets, keeping any added before it finished. */
    async hydrate() {
      if (!storage) return;
      try {
        const saved: unknown = JSON.parse(
          (await storage.getItem(SUPPORT_TICKETS_KEY)) ?? '[]',
        );
        if (!Array.isArray(saved)) return;
        const valid = saved.flatMap((item) => {
          const parsed = supportTicket.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        });
        const ids = new Set(tickets.map((ticket) => ticket.id));
        tickets = [
          ...tickets,
          ...valid.filter((ticket) => !ids.has(ticket.id)),
        ].slice(0, MAX_TICKETS);
        listeners.forEach((listener) => listener());
      } catch {
        // Unreadable storage only loses the list of earlier tickets.
      }
    },
    /** Validates and saves a ticket, or returns the first problem found. */
    add(
      owner: string,
      input: unknown,
      now = Date.now(),
      random: () => number = Math.random,
    ): { ok: true; ticket: SupportTicket } | { ok: false; error: string } {
      const parsed = supportTicketInput.safeParse(input);
      if (!parsed.success)
        return {
          ok: false,
          error: parsed.error.issues[0]?.message ?? 'Check the ticket details.',
        };
      const ticket: SupportTicket = {
        ...parsed.data,
        id: `${now}-${Math.floor(random() * 1e9)}`,
        reference: ticketReference(random),
        owner,
        createdAt: now,
      };
      publish([ticket, ...tickets].slice(0, MAX_TICKETS));
      return { ok: true, ticket };
    },
  };
}
