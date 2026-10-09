import { randomBytes, randomUUID } from 'node:crypto';
import { getAddress, recoverMessageAddress } from 'viem';

const challengeLifetimeMs = 5 * 60_000;
const sessionLifetimeMs = 7 * 24 * 60 * 60_000;

type Challenge = {
  address: `0x${string}`;
  message: string;
  expiresAt: number;
};

type Session = {
  address: `0x${string}`;
  expiresAt: number;
};

const challenges = new Map<string, Challenge>();
const sessions = new Map<string, Session>();

function normalizeAddress(value: string): `0x${string}` {
  return getAddress(value) as `0x${string}`;
}

export function createChallenge(address: string) {
  const normalizedAddress = normalizeAddress(address);
  const nonce = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + challengeLifetimeMs;
  const message = [
    'TravelPay wants you to sign in with your Ethereum account:',
    normalizedAddress,
    '',
    'Sign in to TravelPay.',
    '',
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
  challenges.set(nonce, { address: normalizedAddress, message, expiresAt });
  return { nonce, message, expiresAt };
}

export async function verifyChallenge(
  address: string,
  nonce: string,
  signature: `0x${string}`,
) {
  const challenge = challenges.get(nonce);
  challenges.delete(nonce);
  if (!challenge || challenge.expiresAt <= Date.now()) {
    throw new Error('The sign-in request expired. Please try again.');
  }
  const normalizedAddress = normalizeAddress(address);
  if (challenge.address !== normalizedAddress) {
    throw new Error('The sign-in request does not match this wallet.');
  }
  const recovered = await recoverMessageAddress({
    message: challenge.message,
    signature,
  });
  if (getAddress(recovered) !== normalizedAddress) {
    throw new Error('The wallet signature could not be verified.');
  }
  const token = randomUUID();
  sessions.set(token, {
    address: normalizedAddress,
    expiresAt: Date.now() + sessionLifetimeMs,
  });
  return {
    token,
    address: normalizedAddress,
    expiresAt: Date.now() + sessionLifetimeMs,
  };
}

export function getSession(authorization: string | undefined) {
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

export function revokeSession(authorization: string | undefined) {
  const session = getSession(authorization);
  if (session) sessions.delete(session.token);
}

export function clearAuthState() {
  challenges.clear();
  sessions.clear();
}
