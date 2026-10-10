export type LegalDocumentId = 'terms' | 'privacy' | 'cookies' | 'refunds';

/** A paragraph, a paragraph led by a bold label, or a bulleted list. */
export type LegalBlock =
  string | { label: string; text: string } | { bullets: readonly string[] };

export type LegalSection = { heading: string; body: readonly LegalBlock[] };

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  /** One line under the title on the Terms & Privacy list. */
  summary: string;
  sections: readonly LegalSection[];
};

/** When the documents below last changed (ISO date). */
export const LEGAL_EFFECTIVE_DATE = '2026-10-01';

/** A date such as "October 1, 2026", or "October 2026" with `monthOnly`. */
export function formatLegalDate(iso: string, monthOnly = false) {
  const [year, month, day] = iso.split('-').map(Number);
  const name = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][(month ?? 1) - 1];
  return monthOnly ? `${name} ${year}` : `${name} ${day}, ${year}`;
}

/** Legal documents, in the order the Terms & Privacy screen lists them. */
export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    summary: 'Usage rules, user agreement & obligations',
    sections: [
      {
        heading: 'Scope & Nature of the Service',
        body: [
          'The App functions strictly as an interactive software interface and routing middleware enabling peer-to-peer and merchant payments via public distributed ledger networks (blockchains).',
          {
            label: 'Interface Only',
            text: 'The App is a non-custodial, decentralized execution frontend. The Company is not a bank, money transmitter, custodian, currency exchange, or depository institution.',
          },
          {
            label: 'Smart Contract Routing',
            text: 'While transaction abstraction layers (such as account abstraction, relayer infrastructure, or gas sponsorship) simplify user execution, your transactions are broadcasted directly onto decentralized public blockchains.',
          },
        ],
      },
      {
        heading: 'Third-Party Wallet Integration (MetaMask & Web3 Providers)',
        body: [
          {
            label: 'Non-Custodial Relationship',
            text: 'Wallet connections and signature approvals are facilitated through third-party services, including MetaMask (Consensys Software Inc.) or compatible Web3 provider protocols.',
          },
          {
            label: 'Zero Custody of Keys',
            text: 'The Company never has access to, nor does it store, manage, transmit, or hold custody of your private keys, seed phrases, recovery passwords, or personal wallet credentials.',
          },
          {
            label: 'Full Self-Responsibility',
            text: 'You are solely responsible for securing your wallet credentials and any signing keys. Any transaction authorized via a connected wallet is irreversible.',
          },
        ],
      },
      {
        heading: 'Absolute Disclaimer of Liability & Blockchain Finality',
        body: [
          {
            label: 'Transaction Irreversibility',
            text: 'Once a transaction request is broadcast to and confirmed by the underlying blockchain network, it cannot be canceled, amended, reversed, or refunded by the Company.',
          },
          {
            label: 'No Liability for Funds or Errors',
            text: 'To the fullest extent permitted by law, the Company disclaims all liability for:',
          },
          {
            bullets: [
              'Incorrect recipient wallet addresses or QR codes scanned by the user.',
              'Failures, bugs, downtime, or security incidents within MetaMask, external smart contracts, or public blockchain networks.',
              'Network congestion, protocol forks, validation delays, or volatile slippage.',
              'Merchant-consumer disputes regarding delivered goods, services, chargebacks, or off-chain settlement quality.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    summary: 'How we collect, use & secure your data',
    sections: [
      {
        heading: 'Information We Do NOT Collect',
        body: [
          {
            label: 'No Private Keys / Passwords',
            text: 'We do not collect, view, or store your private cryptographic keys, seed phrases, or MetaMask passwords.',
          },
          {
            label: 'No Direct Banking Credentials',
            text: 'We do not retain sensitive payment cards, bank passwords, or PINs.',
          },
        ],
      },
      {
        heading: 'Information Handled',
        body: [
          {
            label: 'Public Ledger Data',
            text: 'Public wallet addresses, public contract interactions, and on-chain transaction hashes are inherently public records viewable on distributed ledgers.',
          },
          {
            label: 'App Operational Telemetry',
            text: 'Basic device diagnostics, crash logs, and localized connection states required to route transactions smoothly through gasless relayer APIs.',
          },
        ],
      },
      {
        heading: 'Third-Party Data Transmission',
        body: [
          'When executing transactions or connecting your wallet, certain interaction data is handled directly by third-party infrastructure providers (e.g., MetaMask/Infura, RPC node runners, and decentralized relayer networks) under their respective privacy policies.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies Policy',
    summary: 'Tracking, preferences & cookies usage',
    sections: [
      {
        heading: 'No Tracking Cookies',
        body: [
          'The TravelPe app does not use advertising or tracking cookies, and does not include third-party analytics.',
        ],
      },
      {
        heading: 'Local Storage on Your Phone',
        body: [
          'The app saves a few items on your phone so it works as you expect: your sign-in session, preferences such as which notifications you have read, and the data described in the Privacy Policy.',
        ],
      },
      {
        heading: 'Sign-in Pages',
        body: [
          'When you sign in with Google or connect MetaMask, those services may set their own cookies under their own policies.',
        ],
      },
      {
        heading: 'Managing Storage',
        body: [
          'Signing out removes your session. Clearing the app’s storage in your phone settings, or removing the app, deletes everything it saved.',
        ],
      },
    ],
  },
  {
    id: 'refunds',
    title: 'Refund & Dispute Policy',
    summary: 'Disputes, failed transactions & refunds',
    sections: [
      {
        heading: 'Failed Payments',
        body: [
          'A failed payment is not sent, so no tokens leave your wallet. If your balance looks lower after a failure, check Activity and raise a support ticket with the payment attached.',
        ],
      },
      {
        heading: 'Completed Payments Are Final',
        body: [
          'Blockchain payments cannot be reversed. TravelPe cannot cancel or claw back a payment that the network has confirmed.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'For a wrong amount or an unwanted purchase, ask the merchant for a refund. While INR settlement is simulated on the testnet, no real money is owed or refunded.',
        ],
      },
      {
        heading: 'Raising a Dispute',
        body: [
          'Open Profile → Help & Support → Raise a Support Ticket, choose Transaction Issue and attach the payment. Include what went wrong and any screenshots.',
        ],
      },
    ],
  },
];

/** Shown where a wallet is connected. */
export const NON_CUSTODIAL_NOTICE =
  'Non-Custodial Service: Your wallet and funds remain under your full control via MetaMask. We never hold your keys or assets.';

/** Shown above Slide to Pay. */
export const PAYMENT_FINALITY_NOTICE =
  'Blockchain transactions are final and non-reversible. Please verify merchant details and amount before signing.';

/** Plain text of a block, for keys and accessibility. */
export function legalBlockText(block: LegalBlock) {
  if (typeof block === 'string') return block;
  return 'bullets' in block
    ? block.bullets.join(' ')
    : `${block.label}: ${block.text}`;
}

export function findLegalDocument(id: unknown) {
  return LEGAL_DOCUMENTS.find((document) => document.id === id) ?? null;
}
