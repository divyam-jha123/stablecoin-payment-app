import { z } from 'zod';
import { inrAmountSchema, vpaSchema } from './upi.js';

export const parseQrRequestSchema = z
  .object({
    qrData: z.string().min(1).max(4_096),
  })
  .strict();

export const parsedQrResponseSchema = z.object({
  data: z.object({
    merchant: z.object({
      name: z.string().min(1).max(120),
      vpa: vpaSchema,
      verificationStatus: z.literal('unverified'),
    }),
    payment: z.object({
      currency: z.literal('INR'),
      inrAmount: inrAmountSchema.nullable(),
      amountEntryRequired: z.boolean(),
    }),
  }),
});

export type ParsedQrResponse = z.infer<typeof parsedQrResponseSchema>;
