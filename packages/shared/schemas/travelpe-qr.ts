import { z } from 'zod';
import { inrAmountSchema } from './upi.js';

export const travelPeCurrencySchema = z.enum(['USDC', 'USDT', 'pathUSD']);
export type TravelPeCurrency = z.infer<typeof travelPeCurrencySchema>;

const recipientIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._-]{1,39}@travelpe$/);
export function hasUnsafeQrTextCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (
      code <= 31 ||
      code === 127 ||
      code === 0x200e ||
      code === 0x200f ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    );
  });
}
const recipientNameSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => !hasUnsafeQrTextCharacter(value));
const noteSchema = z
  .string()
  .min(1)
  .max(120)
  .refine((value) => !hasUnsafeQrTextCharacter(value));

export const travelPePaymentRequestSchema = z
  .object({
    version: z.literal(1),
    recipientId: recipientIdSchema,
    recipientName: recipientNameSchema,
    currency: travelPeCurrencySchema,
    inrAmount: inrAmountSchema.optional(),
    note: noteSchema.optional(),
  })
  .strict();

export type TravelPePaymentRequest = z.infer<
  typeof travelPePaymentRequestSchema
>;

export class InvalidTravelPeQrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTravelPeQrError';
  }
}

export function isTravelPeQr(input: string): boolean {
  return /^travelpe:/i.test(input);
}

export function createTravelPeQr(input: TravelPePaymentRequest): string {
  const request = travelPePaymentRequestSchema.parse(input);
  const params = new URLSearchParams({
    v: String(request.version),
    demo: '1',
    to: request.recipientId,
    name: request.recipientName,
    currency: request.currency,
    ...(request.inrAmount ? { am: request.inrAmount } : {}),
    ...(request.note ? { note: request.note } : {}),
  });
  return `travelpe://pay?${params.toString()}`;
}

export function parseTravelPeQr(input: string): TravelPePaymentRequest {
  if (input.length > 1024 || !isTravelPeQr(input)) {
    throw new InvalidTravelPeQrError('Scan a TravelPe payment QR');
  }
  // URLSearchParams accepts bad escapes; validate before decoding.
  try {
    decodeURIComponent(input);
  } catch {
    throw new InvalidTravelPeQrError('QR contains malformed text');
  }
  let uri: URL;
  try {
    uri = new URL(input);
  } catch {
    throw new InvalidTravelPeQrError('Scan a valid TravelPe payment QR');
  }
  if (
    uri.protocol !== 'travelpe:' ||
    uri.hostname !== 'pay' ||
    uri.pathname !== '' ||
    uri.hash ||
    uri.username ||
    uri.password ||
    uri.port
  ) {
    throw new InvalidTravelPeQrError('Scan a TravelPe payment QR');
  }
  const allowed = new Set([
    'v',
    'demo',
    'to',
    'name',
    'currency',
    'am',
    'note',
  ]);
  for (const key of uri.searchParams.keys()) {
    if (!allowed.has(key) || uri.searchParams.getAll(key).length !== 1) {
      throw new InvalidTravelPeQrError(
        'QR contains unsupported payment details',
      );
    }
  }
  if (uri.searchParams.get('demo') !== '1') {
    throw new InvalidTravelPeQrError('QR is not a TravelPe demo payment');
  }
  const result = travelPePaymentRequestSchema.safeParse({
    version: Number(uri.searchParams.get('v')),
    recipientId: uri.searchParams.get('to'),
    recipientName: uri.searchParams.get('name'),
    currency: uri.searchParams.get('currency'),
    ...(uri.searchParams.has('am')
      ? { inrAmount: uri.searchParams.get('am') }
      : {}),
    ...(uri.searchParams.has('note')
      ? { note: uri.searchParams.get('note') }
      : {}),
  });
  if (!result.success) {
    throw new InvalidTravelPeQrError('QR has invalid payment details');
  }
  return result.data;
}
