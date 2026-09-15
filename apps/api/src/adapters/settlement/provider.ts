import { z } from 'zod';

export const initiateSettlementInputSchema = z.object({
  paymentId: z.uuid(),
  idempotencyKey: z.string().min(1).max(128),
  sourceAmountAtomic: z.string().max(78).regex(/^[1-9]\d*$/),
  inrAmount: z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/).refine((value) => /[1-9]/.test(value)),
}).strict();
export type InitiateSettlementInput = z.infer<typeof initiateSettlementInputSchema>;
export interface SettlementResult {
  id: string;
  paymentId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  mode: 'mock' | 'sandbox';
  simulated: true;
}
export interface FiatSettlementProvider {
  initiateSettlement(input: InitiateSettlementInput): Promise<SettlementResult>;
}
