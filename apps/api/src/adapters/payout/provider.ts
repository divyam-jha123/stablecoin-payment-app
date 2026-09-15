import { z } from 'zod';

export const createPayoutInputSchema = z.object({
  paymentId: z.uuid(),
  idempotencyKey: z.string().min(1).max(128),
  merchantVpa: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$/).max(255),
  inrAmount: z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/).refine((value) => /[1-9]/.test(value)),
}).strict();
export type CreatePayoutInput = z.infer<typeof createPayoutInputSchema>;
export type PayoutStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export interface PayoutResult {
  id: string;
  paymentId: string;
  status: PayoutStatus;
  mode: 'mock' | 'sandbox';
  simulated: true;
}
export interface PayoutProvider {
  createPayout(input: CreatePayoutInput): Promise<PayoutResult>;
  getPayoutStatus(id: string): Promise<PayoutStatus>;
}
