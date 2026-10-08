import type { TravelPeCurrency } from '@traveller/shared';

export interface ScannerPaymentAccount {
  symbol: TravelPeCurrency;
  name: string;
  color: string;
}

export interface ScannerPaymentBalance {
  inr: string;
  tokens: string;
}

// Fixed design fixtures for the hackathon, never RPC balances or live quotes.
export const SCANNER_DEMO_ACCOUNTS: readonly {
  account: ScannerPaymentAccount;
  balance: ScannerPaymentBalance;
}[] = [
  {
    account: { symbol: 'USDC', name: 'USD Coin', color: '#2775ca' },
    balance: { inr: '12,450.75', tokens: '148.32' },
  },
  {
    account: { symbol: 'USDT', name: 'Tether', color: '#008665' },
    balance: { inr: '8,300.00', tokens: '100.00' },
  },
  {
    account: { symbol: 'pathUSD', name: 'Path USD', color: '#081332' },
    balance: { inr: '4,150.00', tokens: '50.00' },
  },
];

export function getScannerDemoAccount(symbol: string | undefined) {
  return SCANNER_DEMO_ACCOUNTS.find((entry) => entry.account.symbol === symbol);
}
