import type {
  IncomingHttpHeaders,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleApiRequest } from './app.js';

type CapturedResponse = {
  body: unknown;
  headers: Record<string, string>;
  status: number;
};

async function request(
  method: string,
  path: string,
  body?: unknown,
  headers: IncomingHttpHeaders = { 'content-type': 'application/json' },
): Promise<CapturedResponse> {
  const serializedBody = body === undefined ? '' : JSON.stringify(body);
  const incoming = Object.assign(Readable.from([serializedBody]), {
    headers,
    method,
    url: path,
  }) as unknown as IncomingMessage;
  const captured: CapturedResponse = {
    body: undefined,
    headers: {},
    status: 0,
  };
  const outgoing = {
    end(value?: string) {
      captured.body =
        value === undefined || value === '' ? undefined : JSON.parse(value);
    },
    headersSent: false,
    writeHead(status: number, responseHeaders: Record<string, string>) {
      captured.status = status;
      captured.headers = Object.fromEntries(
        Object.entries(responseHeaders).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      );
      this.headersSent = true;
      return this;
    },
  } as unknown as ServerResponse;

  await handleApiRequest(incoming, outgoing);
  return captured;
}

describe('QR parsing API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns QR-derived merchant data and preserves the exact amount', async () => {
    const terminalLog = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const response = await request('POST', '/v1/qr/parse', {
      qrData: 'upi://pay?pa=coffee@bank&pn=Coffee%20House&am=250.50&cu=INR',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        merchant: {
          name: 'Coffee House',
          vpa: 'coffee@bank',
          verificationStatus: 'unverified',
        },
        payment: {
          currency: 'INR',
          inrAmount: '250.50',
          amountEntryRequired: false,
        },
      },
    });
    expect(terminalLog).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'qr.merchant_parsed',
        merchant: {
          name: 'Coffee House',
          vpa: 'coffee@bank',
          verificationStatus: 'unverified',
        },
        payment: {
          currency: 'INR',
          inrAmount: '250.50',
          amountEntryRequired: false,
        },
      }),
    );
  });

  it('signals when a valid QR requires manual amount entry', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const response = await request('POST', '/v1/qr/parse', {
      qrData: 'upi://pay?pa=coffee@bank&pn=Coffee',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: { payment: { inrAmount: null, amountEntryRequired: true } },
    });
  });

  it.each([
    [{}, 'INVALID_REQUEST'],
    [{ qrData: 'https://example.com' }, 'INVALID_UPI_QR'],
    [{ qrData: 'upi://pay?pa=merchant@upi', extra: true }, 'INVALID_REQUEST'],
  ])('rejects invalid input without exposing internals', async (body, code) => {
    const response = await request('POST', '/v1/qr/parse', body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code } });
  });

  it('rejects non-JSON requests and unsupported methods', async () => {
    const wrongContentType = await request(
      'POST',
      '/v1/qr/parse',
      { qrData: 'upi://pay?pa=merchant@upi' },
      {},
    );
    expect(wrongContentType.status).toBe(415);

    const wrongMethod = await request('GET', '/v1/qr/parse');
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers['allow']).toBe('POST');
  });
});
