import { z } from 'zod';

// A conservative MVP syntax check, not proof a VPA exists or is a merchant.
export const vpaSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$/);

export const inrAmountSchema = z
  .string()
  .max(12)
  .regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/, 'Use an INR amount with up to two decimals')
  .refine((value) => /[1-9]/.test(value), 'Amount must be greater than zero');

export const upiQrSchema = z.object({
  vpa: vpaSchema,
  merchantName: z.string().min(1).max(120),
  amount: z.number().positive().optional(),
  currency: z.literal('INR'),
});

export type ParsedUpiQr = z.infer<typeof upiQrSchema>;

export class InvalidUpiQrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUpiQrError';
  }
}

function parseFields(input: string): {
  vpa: string;
  merchantName: string;
  amountText: string | undefined;
} {
  if (input.length > 4096 || /[\u0000-\u0020\u007f]/u.test(input)) {
    throw new InvalidUpiQrError('QR contains invalid characters or is too long');
  }
  // URLSearchParams tolerates broken escapes. Reject them before URL parsing.
  try {
    decodeURIComponent(input);
  } catch {
    throw new InvalidUpiQrError('QR contains malformed text encoding');
  }

  let uri: URL;
  try {
    uri = new URL(input);
  } catch {
    throw new InvalidUpiQrError('Scan a valid UPI payment QR');
  }
  if (
    uri.protocol.toLowerCase() !== 'upi:' ||
    uri.hostname.toLowerCase() !== 'pay' ||
    uri.pathname !== '' ||
    uri.username ||
    uri.password ||
    uri.port ||
    uri.hash
  ) {
    throw new InvalidUpiQrError('Scan a UPI payment QR');
  }

  const params = uri.searchParams;
  for (const key of ['pa', 'pn', 'am', 'cu']) {
    if (params.getAll(key).length > 1) {
      throw new InvalidUpiQrError(`QR contains duplicate ${key} fields`);
    }
  }

  const vpa = vpaSchema.safeParse(params.get('pa'));
  if (!vpa.success) throw new InvalidUpiQrError('QR has an invalid UPI address');

  const name = params.get('pn');
  const merchantName = name === null ? vpa.data : name.trim();
  if (
    merchantName.length === 0 ||
    merchantName.length > 120 ||
    /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(
      merchantName,
    )
  ) {
    throw new InvalidUpiQrError('QR has an invalid merchant name');
  }

  // Missing currency means INR for this explicitly UPI-only MVP; never convert.
  if (params.has('cu') && params.get('cu') !== 'INR') {
    throw new InvalidUpiQrError('Only INR UPI payments are supported');
  }

  const amountText = params.get('am') ?? undefined;
  if (amountText !== undefined && !inrAmountSchema.safeParse(amountText).success) {
    throw new InvalidUpiQrError('QR amount must be positive INR with up to two decimals');
  }
  return { vpa: vpa.data, merchantName, amountText };
}

/** Presentation contract. Do not use its numeric amount for payment arithmetic. */
export function parseUpiQr(input: string): ParsedUpiQr {
  const { vpa, merchantName, amountText } = parseFields(input);
  return upiQrSchema.parse({
    vpa,
    merchantName,
    ...(amountText === undefined ? {} : { amount: Number(amountText) }),
    currency: 'INR',
  });
}

/** Preserve validated decimal input for the later exact-money payment boundary. */
export function parseUpiPaymentDraft(input: string): {
  vpa: string;
  merchantName: string;
  inrAmount: string | undefined;
  currency: 'INR';
} {
  const { vpa, merchantName, amountText } = parseFields(input);
  return { vpa, merchantName, inrAmount: amountText, currency: 'INR' };
}
