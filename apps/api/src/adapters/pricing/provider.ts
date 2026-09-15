import type { PaymentQuote, SupportedAsset } from '@traveller/shared';

export interface CreateQuoteInput {
  paymentId: string;
  merchantVpa: string;
  merchantName: string;
  inrAmount: string;
  sourceAsset: SupportedAsset;
}

export interface PricingProvider {
  createQuote(input: CreateQuoteInput): Promise<PaymentQuote>;
}

export class UnconfiguredPricingProvider implements PricingProvider {
  createQuote(): Promise<PaymentQuote> {
    return Promise.reject(new Error('Quotation is scheduled for Week 2'));
  }
}
