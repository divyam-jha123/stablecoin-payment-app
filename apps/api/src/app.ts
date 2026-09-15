import { createServer, type RequestListener, type Server } from 'node:http';
import { sendError, sendJson } from './http/responses.js';
import { handleQrParse } from './routes/qr.js';

export const apiHandler: RequestListener = (request, response) => {
  void handleApiRequest(request, response).catch(() => {
    if (!response.headersSent) {
      sendError(
        response,
        500,
        'INTERNAL_ERROR',
        'The request could not be processed',
      );
    } else {
      response.end();
    }
  });
};

export async function handleApiRequest(
  request: Parameters<RequestListener>[0],
  response: Parameters<RequestListener>[1],
): Promise<void> {
  const pathname = new URL(request.url ?? '/', 'http://api.local').pathname;

  if (pathname === '/health') {
    if (request.method !== 'GET') {
      sendError(response, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', {
        Allow: 'GET',
      });
      return;
    }
    sendJson(response, 200, {
      status: 'ok',
      service: 'traveller-api',
      paymentsEnabled: false,
      settlementMode: 'mock',
    });
    return;
  }

  if (pathname === '/v1/qr/parse') {
    if (request.method !== 'POST') {
      sendError(response, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed', {
        Allow: 'POST',
      });
      return;
    }
    await handleQrParse(request, response);
    return;
  }

  sendError(response, 404, 'NOT_FOUND', 'This route is not available');
}

export function createApiServer(): Server {
  return createServer(apiHandler);
}
