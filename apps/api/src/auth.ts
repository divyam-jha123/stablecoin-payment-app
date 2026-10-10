import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getAddress, recoverMessageAddress } from 'viem';

const challengeLifetimeMs = 5 * 60_000;
const sessionLifetimeMs = 7 * 24 * 60 * 60_000;
const tokenVersion = 'v1';
export const minimumSessionSecretLength = 32;

type Address = `0x${string}`;

type ChallengePayload = {
  address: Address;
  nonce: string;
  issuedAt: string;
  expiresAt: number;
};

type SessionPayload = {
  address: Address;
  expiresAt: number;
  /** Identifies this sign-in so it can be listed and removed on its own. */
  sid?: string;
  /** The phone's own name for itself, such as "Google Pixel 8". */
  device?: string;
  issuedAt?: number;
};

export type AuthorizedDevice = {
  id: string;
  device: string;
  signedInAt: number;
  lastSeenAt: number;
  expiresAt: number;
};

const maxDeviceNameLength = 60;

// Sessions and challenges are signed, not stored, so they survive restarts
// and work across instances. Without a configured secret (development and
// tests) each process signs with its own random key.
let secret: Buffer = randomBytes(32);

// Best effort only: logged-out tokens and used challenges are remembered in
// memory until they expire or the process restarts.
const revokedSessions = new Map<string, number>();
const usedChallenges = new Map<string, number>();
// Removed devices, by session id, until their tokens would have expired.
const revokedDevices = new Map<string, number>();
// Signed-in devices per wallet. After a restart each device reappears the
// next time its session is checked, since its token carries the details.
const devices = new Map<Address, Map<string, AuthorizedDevice>>();

export function configureAuth(options: { sessionSecret: string }) {
  if (options.sessionSecret.length < minimumSessionSecretLength) {
    throw new Error(
      `SESSION_SECRET must be at least ${minimumSessionSecretLength} characters.`,
    );
  }
  secret = Buffer.from(options.sessionSecret, 'utf8');
}

function normalizeAddress(value: string): Address {
  return getAddress(value) as Address;
}

function mac(kind: 'challenge' | 'session', body: string) {
  return createHmac('sha256', secret)
    .update(`${tokenVersion}.${kind}.${body}`)
    .digest('base64url');
}

function sign(kind: 'challenge' | 'session', payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${tokenVersion}.${body}.${mac(kind, body)}`;
}

/** The payload of a token this server signed, or null if it was not. */
function verify(kind: 'challenge' | 'session', token: string): unknown {
  const [version, body, signature, ...rest] = token.split('.');
  if (version !== tokenVersion || !body || !signature || rest.length) {
    return null;
  }
  const expected = Buffer.from(mac(kind, body));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function prune(entries: Map<string, number>) {
  const now = Date.now();
  for (const [key, expiresAt] of entries) {
    if (expiresAt <= now) entries.delete(key);
  }
}

function challengeMessage(challenge: ChallengePayload) {
  return [
    'TravelPay wants you to sign in with your Ethereum account:',
    challenge.address,
    '',
    'Sign in to TravelPay.',
    '',
    `Nonce: ${challenge.nonce}`,
    `Issued At: ${challenge.issuedAt}`,
  ].join('\n');
}

export function createChallenge(address: string) {
  const challenge: ChallengePayload = {
    address: normalizeAddress(address),
    nonce: randomBytes(16).toString('hex'),
    issuedAt: new Date().toISOString(),
    expiresAt: Date.now() + challengeLifetimeMs,
  };
  return {
    nonce: sign('challenge', challenge),
    message: challengeMessage(challenge),
    expiresAt: challenge.expiresAt,
  };
}

function readChallenge(token: string): ChallengePayload | null {
  const payload = verify('challenge', token);
  if (
    !isRecord(payload) ||
    typeof payload.address !== 'string' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.issuedAt !== 'string' ||
    typeof payload.expiresAt !== 'number'
  ) {
    return null;
  }
  return {
    address: payload.address as Address,
    nonce: payload.nonce,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  };
}

/** A short, printable device label; anything else becomes "Unknown device". */
export function cleanDeviceName(value: unknown) {
  if (typeof value !== 'string') return 'Unknown device';
  const name = value
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxDeviceNameLength);
  return name || 'Unknown device';
}

function rememberDevice(session: Required<SessionPayload>, now: number) {
  let byId = devices.get(session.address);
  if (!byId) {
    byId = new Map();
    devices.set(session.address, byId);
  }
  const known = byId.get(session.sid);
  byId.set(session.sid, {
    id: session.sid,
    device: session.device,
    signedInAt: session.issuedAt,
    lastSeenAt: Math.max(known?.lastSeenAt ?? 0, now),
    expiresAt: session.expiresAt,
  });
}

export async function verifyChallenge(
  address: string,
  nonce: string,
  signature: `0x${string}`,
  device?: unknown,
) {
  prune(usedChallenges);
  const challenge = readChallenge(nonce);
  if (
    !challenge ||
    challenge.expiresAt <= Date.now() ||
    usedChallenges.has(challenge.nonce)
  ) {
    throw new Error('The sign-in request expired. Please try again.');
  }
  usedChallenges.set(challenge.nonce, challenge.expiresAt);
  const normalizedAddress = normalizeAddress(address);
  if (challenge.address !== normalizedAddress) {
    throw new Error('The sign-in request does not match this wallet.');
  }
  const recovered = await recoverMessageAddress({
    message: challengeMessage(challenge),
    signature,
  });
  if (getAddress(recovered) !== normalizedAddress) {
    throw new Error('The wallet signature could not be verified.');
  }
  const now = Date.now();
  const session: Required<SessionPayload> = {
    address: normalizedAddress,
    expiresAt: now + sessionLifetimeMs,
    sid: randomBytes(12).toString('base64url'),
    device: cleanDeviceName(device),
    issuedAt: now,
  };
  rememberDevice(session, now);
  return {
    token: sign('session', session),
    address: session.address,
    expiresAt: session.expiresAt,
  };
}

function bearerToken(authorization: string | undefined) {
  return authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
}

export function getSession(authorization: string | undefined) {
  const token = bearerToken(authorization);
  const payload = token ? verify('session', token) : null;
  if (
    !isRecord(payload) ||
    typeof payload.address !== 'string' ||
    typeof payload.expiresAt !== 'number' ||
    payload.expiresAt <= Date.now() ||
    revokedSessions.has(token) ||
    (typeof payload.sid === 'string' && revokedDevices.has(payload.sid))
  ) {
    return null;
  }
  const address = payload.address as Address;
  const sid = typeof payload.sid === 'string' ? payload.sid : null;
  if (sid) {
    const now = Date.now();
    rememberDevice(
      {
        address,
        expiresAt: payload.expiresAt,
        sid,
        device: cleanDeviceName(payload.device),
        issuedAt:
          typeof payload.issuedAt === 'number'
            ? payload.issuedAt
            : payload.expiresAt - sessionLifetimeMs,
      },
      now,
    );
  }
  return { token, address, expiresAt: payload.expiresAt, sid };
}

/** The wallet's signed-in devices, most recently used first. */
export function listDevices(address: Address) {
  const byId = devices.get(address);
  if (!byId) return [];
  const now = Date.now();
  for (const [id, entry] of byId) {
    if (entry.expiresAt <= now || revokedDevices.has(id)) byId.delete(id);
  }
  return [...byId.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

/**
 * Signs one of the wallet's devices out. Returns false for an id that isn't
 * one of this wallet's signed-in devices.
 */
export function revokeDevice(address: Address, id: string) {
  prune(revokedDevices);
  const entry = devices.get(address)?.get(id);
  if (!entry || entry.expiresAt <= Date.now()) return false;
  revokedDevices.set(id, entry.expiresAt);
  devices.get(address)?.delete(id);
  return true;
}

export function revokeSession(authorization: string | undefined) {
  prune(revokedSessions);
  const session = getSession(authorization);
  if (!session) return;
  revokedSessions.set(session.token, session.expiresAt);
  if (session.sid) devices.get(session.address)?.delete(session.sid);
}

export function clearAuthState() {
  revokedSessions.clear();
  usedChallenges.clear();
  revokedDevices.clear();
  devices.clear();
}
