import { z } from 'zod';
import { inrAmountSchema, vpaSchema } from './upi.js';
import { paymentStatusSchema } from '../constants/payment-status.js';

// Identifiers are not an enabled token list. Actual test-token choice is pending.
export const supportedAssetSchema = z.enum(['USDC', 'USDT', 'USD_TEST']);
export type SupportedAsset = z.infer<typeof supportedAssetSchema>;

const positiveDecimal = z.string().max(40).regex(/^(0|[1-9]\d*)(\.\d+)?$/).refine((value) => /[1-9]/.test(value));
export const paymentQuoteSchema = z.object({
  paymentId: z.uuid(),
  merchantVpa: vpaSchema,
  merchantName: z.string().min(1).max(120),
  inrAmount: inrAmountSchema,
  sourceAsset: supportedAssetSchema,
  sourceAmount: positiveDecimal,
  exchangeRate: positiveDecimal, // INR per one source stablecoin unit.
  fees: z.object({ amount: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/), currency: z.literal('INR') }).strict(),
  expiresAt: z.iso.datetime(),
  pricingMode: z.enum(['mock', 'live']),
}).strict();
export type PaymentQuote = z.infer<typeof paymentQuoteSchema>;

export const paymentSchema = z.object({
  id: z.uuid(),
  merchantVpa: vpaSchema,
  merchantName: z.string().min(1).max(120),
  inrAmount: inrAmountSchema,
  sourceAsset: supportedAssetSchema,
  status: paymentStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();
export type Payment = z.infer<typeof paymentSchema>;
