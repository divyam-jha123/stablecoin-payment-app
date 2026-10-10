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
};

// Sessions and challenges are signed, not stored, so they survive restarts
// and work across instances. Without a configured secret (development and
// tests) each process signs with its own random key.
let secret: Buffer = randomBytes(32);

// Best effort only: logged-out tokens and used challenges are remembered in
// memory until they expire or the process restarts.
const revokedSessions = new Map<string, number>();
const usedChallenges = new Map<string, number>();

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

export async function verifyChallenge(
  address: string,
  nonce: string,
  signature: `0x${string}`,
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
  const session: SessionPayload = {
    address: normalizedAddress,
    expiresAt: Date.now() + sessionLifetimeMs,
  };
  return { token: sign('session', session), ...session };
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
    revokedSessions.has(token)
  ) {
    return null;
  }
  return {
    token,
    address: payload.address as Address,
    expiresAt: payload.expiresAt,
  };
}

export function revokeSession(authorization: string | undefined) {
  prune(revokedSessions);
  const session = getSession(authorization);
  if (session) revokedSessions.set(session.token, session.expiresAt);
}

export function clearAuthState() {
  revokedSessions.clear();
  usedChallenges.clear();
}
