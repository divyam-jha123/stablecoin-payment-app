import type { ServerResponse } from 'node:http';

export type ApiErrorCode =
  | 'INTERNAL_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'INVALID_UPI_QR'
  | 'METHOD_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE';

export function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

export function sendError(
  response: ServerResponse,
  status: number,
  code: ApiErrorCode,
  message: string,
  headers?: Readonly<Record<string, string>>,
): void {
  sendJson(response, status, { error: { code, message } }, headers);
}
