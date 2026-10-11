import { ILLUSTRATIVE_INR_PER_PATH_USD } from './amount';

/** Currencies the Add Money preview can top up. */
export const ADD_MONEY_CURRENCIES = ['USDC', 'USDT', 'INR'] as const;
export type AddMoneyCurrency = (typeof ADD_MONEY_CURRENCIES)[number];

const illustrativeRate = Number(ILLUSTRATIVE_INR_PER_PATH_USD);

/** A currency from route params, falling back to USDC. */
export function addMoneyCurrency(value: unknown): AddMoneyCurrency {
  return ADD_MONEY_CURRENCIES.find((currency) => currency === value) ?? 'USDC';
}

/**
 * What a rupee amount becomes in the chosen currency, such as
 * "12.05 USDC" or "₹1,000". Stablecoins use the illustrative rate.
 */
export function addMoneyReceive(inr: number, currency: AddMoneyCurrency) {
  const valid = Number.isFinite(inr) && inr > 0 ? inr : 0;
  if (currency === 'INR')
    return `₹${valid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return `${(valid / illustrativeRate).toFixed(2)} ${currency}`;
}

/** "1 USDT ≈ ₹83.00", or a note that rupees are not converted. */
export function addMoneyRate(currency: AddMoneyCurrency) {
  return currency === 'INR'
    ? 'No conversion · added as Indian Rupees'
    : `1 ${currency} ≈ ₹${ILLUSTRATIVE_INR_PER_PATH_USD}`;
}
