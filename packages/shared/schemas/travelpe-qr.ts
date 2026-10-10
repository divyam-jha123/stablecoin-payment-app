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
    // Left out when the receiver has no name on file; the ID still pays them.
    recipientName: recipientNameSchema.optional(),
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

const WALLET_ID = /^([0-9a-f]{40})@travelpe$/;

/** TravelPe ID for a wallet: its address without 0x, lowercase. */
export function travelPeIdForAddress(address: string): string {
  const hex = address.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new InvalidTravelPeQrError('Not a wallet address');
  }
  return `${hex}@travelpe`;
}

/**
 * Wallet address behind a TravelPe ID, or null for IDs that are not tied to a
 * wallet (such as the demo profile).
 */
export function travelPeRecipientAddress(
  recipientId: string,
): `0x${string}` | null {
  const match = WALLET_ID.exec(recipientId.toLowerCase());
  return match ? `0x${match[1]}` : null;
}

/**
 * Who the payer sees: the receiver's name, or a shortened TravelPe ID when the
 * QR carries no name.
 */
export function travelPePayeeName(request: TravelPePaymentRequest): string {
  if (request.recipientName) return request.recipientName;
  const address = travelPeRecipientAddress(request.recipientId);
  return address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : request.recipientId;
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
    ...(request.recipientName ? { name: request.recipientName } : {}),
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
    ...(uri.searchParams.has('name')
      ? { recipientName: uri.searchParams.get('name') }
      : {}),
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
