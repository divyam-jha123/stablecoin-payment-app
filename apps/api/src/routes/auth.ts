import type { IncomingMessage, ServerResponse } from 'node:http';
import { isAddress } from 'viem';
import { readJsonBody, RequestBodyError } from '../http/body.js';
import { sendError, sendJson } from '../http/responses.js';
import {
  createChallenge,
  getSession,
  listDevices,
  revokeDevice,
  revokeSession,
  verifyChallenge,
} from '../auth.js';

function contentTypeIsJson(request: IncomingMessage) {
  return (
    request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() ===
    'application/json'
  );
}

async function body(request: IncomingMessage, response: ServerResponse) {
  if (!contentTypeIsJson(request)) {
    sendError(
      response,
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
    return null;
  }
  try {
    return await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      sendError(
        response,
        error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
        error.code,
        error.message,
      );
      return null;
    }
    throw error;
  }
}

export async function handleAuthChallenge(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const raw = await body(request, response);
  if (
    !raw ||
    typeof raw !== 'object' ||
    raw === null ||
    !('address' in raw) ||
    typeof raw.address !== 'string' ||
    !isAddress(raw.address)
  ) {
    sendError(
      response,
      400,
      'INVALID_REQUEST',
      'Body must contain a valid wallet address',
    );
    return;
  }
  try {
    sendJson(response, 200, { data: createChallenge(raw.address) });
  } catch {
    sendError(
      response,
      400,
      'INVALID_REQUEST',
      'Body must contain a valid wallet address',
    );
  }
}

export async function handleAuthVerify(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const raw = await body(request, response);
  if (
    !raw ||
    typeof raw !== 'object' ||
    raw === null ||
    !('address' in raw) ||
    !('nonce' in raw) ||
    !('signature' in raw) ||
    typeof raw.address !== 'string' ||
    !isAddress(raw.address) ||
    typeof raw.nonce !== 'string' ||
    !/^0x[0-9a-f]+$/i.test(String(raw.signature))
  ) {
    sendError(
      response,
      400,
      'INVALID_REQUEST',
      'Body contains an invalid sign-in payload',
    );
    return;
  }
  try {
    sendJson(response, 200, {
      data: await verifyChallenge(
        raw.address,
        raw.nonce,
        raw.signature as `0x${string}`,
        'device' in raw ? raw.device : undefined,
      ),
    });
  } catch (error) {
    sendError(
      response,
      401,
      'AUTHENTICATION_FAILED',
      error instanceof Error
        ? error.message
        : 'Wallet signature could not be verified',
    );
  }
}

export function handleAuthSession(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const session = getSession(request.headers.authorization);
  if (!session) {
    sendError(
      response,
      401,
      'UNAUTHORIZED',
      'Sign in with your wallet to continue',
    );
    return;
  }
  sendJson(response, 200, {
    data: { address: session.address, expiresAt: session.expiresAt },
  });
}

export function handleAuthLogout(
  request: IncomingMessage,
  response: ServerResponse,
) {
  revokeSession(request.headers.authorization);
  sendJson(response, 204, undefined);
}

function requireSession(request: IncomingMessage, response: ServerResponse) {
  const session = getSession(request.headers.authorization);
  if (!session)
    sendError(
      response,
      401,
      'UNAUTHORIZED',
      'Sign in with your wallet to continue',
    );
  return session;
}

export function handleAuthDevices(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const session = requireSession(request, response);
  if (!session) return;
  sendJson(response, 200, {
    data: listDevices(session.address).map((device) => ({
      ...device,
      current: device.id === session.sid,
    })),
  });
}

export async function handleAuthDeviceRevoke(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const session = requireSession(request, response);
  if (!session) return;
  const raw = await body(request, response);
  if (!raw) return;
  if (
    typeof raw !== 'object' ||
    !('id' in raw) ||
    typeof raw.id !== 'string' ||
    !/^[\w-]{1,64}$/.test(raw.id)
  ) {
    sendError(
      response,
      400,
      'INVALID_REQUEST',
      'Body must contain a device id',
    );
    return;
  }
  if (raw.id === session.sid) {
    sendError(
      response,
      400,
      'INVALID_REQUEST',
      'Sign out from Profile to remove this device',
    );
    return;
  }
  if (!revokeDevice(session.address, raw.id)) {
    sendError(response, 404, 'NOT_FOUND', 'This device is not signed in');
    return;
  }
  sendJson(response, 204, undefined);
}
