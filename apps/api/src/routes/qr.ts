import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  InvalidUpiQrError,
  parseQrRequestSchema,
  parsedQrResponseSchema,
  parseUpiPaymentDraft,
} from '@traveller/shared';
import { readJsonBody, RequestBodyError } from '../http/body.js';
import { sendError, sendJson } from '../http/responses.js';

export async function handleQrParse(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (
    request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() !==
    'application/json'
  ) {
    sendError(
      response,
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
    return;
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      sendError(
        response,
        error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
        error.code,
        error.message,
      );
      return;
    }
    throw error;
  }

  const body = parseQrRequestSchema.safeParse(rawBody);
  if (!body.success) {
    sendError(
      response,
      400,
      'INVALID_REQUEST',
      'Body must contain only a non-empty qrData string',
    );
    return;
  }

  try {
    const draft = parseUpiPaymentDraft(body.data.qrData);
    const result = parsedQrResponseSchema.parse({
      data: {
        merchant: {
          name: draft.merchantName,
          vpa: draft.vpa,
          verificationStatus: 'unverified',
        },
        payment: {
          currency: draft.currency,
          inrAmount: draft.inrAmount ?? null,
          amountEntryRequired: draft.inrAmount === undefined,
        },
      },
    });
    console.info(
      JSON.stringify({
        event: 'qr.merchant_parsed',
        merchant: result.data.merchant,
        payment: result.data.payment,
      }),
    );
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof InvalidUpiQrError) {
      sendError(response, 400, 'INVALID_UPI_QR', error.message);
      return;
    }
    throw error;
  }
}
