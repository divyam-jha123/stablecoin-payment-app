import { inrAmountSchema, vpaSchema } from '@traveller/shared';

/**
 * PIN approval for one payment. Only the PIN screen grants an approval, after
 * a correct (or newly set) PIN, and it covers exactly the payment shown on
 * that screen. Processing spends it before any funds move or anything is
 * recorded, so a link, a retry or a stale screen can never pay without the PIN.
 * Approvals live only in memory, are single use and expire quickly.
 */

export const PAYMENT_TOKENS = ['USDC', 'USDT', 'pathUSD'] as const;
export const APPROVAL_TTL_MS = 60_000;

export type PaymentRequest = {
  merchantName: string;
  merchantVpa?: string;
  location: string;
  inrAmount: string;
  token: (typeof PAYMENT_TOKENS)[number];
};

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

/** Validated payment details from route params, or null when any is wrong. */
export function parsePaymentRequest(params: Params): PaymentRequest | null {
  const merchantName = first(params.merchantName);
  const location = first(params.location);
  const merchantVpa = first(params.merchantVpa);
  const inrAmount = first(params.inrAmount);
  const token = PAYMENT_TOKENS.find((symbol) => symbol === first(params.token));
  if (
    !merchantName ||
    merchantName.length > 120 ||
    location.length > 255 ||
    !token ||
    !inrAmountSchema.safeParse(inrAmount).success ||
    (merchantVpa && !vpaSchema.safeParse(merchantVpa).success)
  )
    return null;
  return {
    merchantName,
    ...(merchantVpa ? { merchantVpa } : {}),
    location,
    inrAmount,
    token,
  };
}

/** Route params for a payment request, for the PIN and processing screens. */
export function paymentParams(request: PaymentRequest) {
  return {
    merchantName: request.merchantName,
    ...(request.merchantVpa ? { merchantVpa: request.merchantVpa } : {}),
    location: request.location,
    inrAmount: request.inrAmount,
    token: request.token,
  };
}

function sameRequest(a: PaymentRequest, b: PaymentRequest) {
  return (
    a.merchantName === b.merchantName &&
    (a.merchantVpa ?? '') === (b.merchantVpa ?? '') &&
    a.location === b.location &&
    a.inrAmount === b.inrAmount &&
    a.token === b.token
  );
}

function randomId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function createPaymentApprovals(
  now: () => number = Date.now,
  newId: () => string = randomId,
) {
  const approvals = new Map<
    string,
    { request: PaymentRequest; expiresAt: number }
  >();
  return {
    /** Called by the PIN screen only, right after the PIN is accepted. */
    grant(request: PaymentRequest) {
      // One pending approval at a time; a new PIN entry replaces any other.
      approvals.clear();
      const id = newId();
      approvals.set(id, { request, expiresAt: now() + APPROVAL_TTL_MS });
      return id;
    },
    /** True once for a live approval of exactly this payment; then it is gone. */
    spend(id: string | undefined, request: PaymentRequest | null) {
      if (!id || !request) return false;
      const approval = approvals.get(id);
      approvals.delete(id);
      return Boolean(
        approval &&
        now() < approval.expiresAt &&
        sameRequest(approval.request, request),
      );
    },
  };
}

export const paymentApprovals = createPaymentApprovals();
