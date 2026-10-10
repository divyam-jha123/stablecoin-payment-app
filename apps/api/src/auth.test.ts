import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  clearAuthState,
  configureAuth,
  createChallenge,
  getSession,
  revokeSession,
  verifyChallenge,
} from './auth.js';

const secret = 'test-session-secret-0123456789abcdef';
const account = privateKeyToAccount(generatePrivateKey());

async function signIn(address = account.address) {
  const challenge = createChallenge(address);
  const signature = await account.signMessage({ message: challenge.message });
  return { challenge, signature };
}

describe('stateless wallet sessions', () => {
  beforeEach(() => {
    configureAuth({ sessionSecret: secret });
    clearAuthState();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs in and reads the session back from the token alone', async () => {
    const { challenge, signature } = await signIn();
    const session = await verifyChallenge(
      account.address,
      challenge.nonce,
      signature,
    );

    expect(session.address).toBe(account.address);
    expect(getSession(`Bearer ${session.token}`)).toMatchObject({
      address: account.address,
      expiresAt: session.expiresAt,
    });
  });

  it('keeps sessions and challenges valid after a restart with the same secret', async () => {
    const { challenge, signature } = await signIn();
    clearAuthState();
    const session = await verifyChallenge(
      account.address,
      challenge.nonce,
      signature,
    );
    clearAuthState();

    expect(getSession(`Bearer ${session.token}`)?.address).toBe(
      account.address,
    );
  });

  it('rejects tokens signed with a different secret', async () => {
    const { challenge, signature } = await signIn();
    const session = await verifyChallenge(
      account.address,
      challenge.nonce,
      signature,
    );
    configureAuth({ sessionSecret: `${secret}-rotated` });

    expect(getSession(`Bearer ${session.token}`)).toBeNull();
  });

  it('rejects a tampered session token', async () => {
    const { challenge, signature } = await signIn();
    const { token } = await verifyChallenge(
      account.address,
      challenge.nonce,
      signature,
    );
    const [version, , mac] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({
        address: privateKeyToAccount(generatePrivateKey()).address,
        expiresAt: Date.now() + 60_000,
      }),
    ).toString('base64url');

    expect(getSession(`Bearer ${version}.${forged}.${mac}`)).toBeNull();
    expect(getSession(token)).toBeNull();
    expect(getSession(undefined)).toBeNull();
  });

  it('accepts each challenge only once', async () => {
    const { challenge, signature } = await signIn();
    await verifyChallenge(account.address, challenge.nonce, signature);

    await expect(
      verifyChallenge(account.address, challenge.nonce, signature),
    ).rejects.toThrow('expired');
  });

  it('rejects a challenge issued for another wallet', async () => {
    const other = privateKeyToAccount(generatePrivateKey());
    const challenge = createChallenge(other.address);
    const signature = await account.signMessage({ message: challenge.message });

    await expect(
      verifyChallenge(account.address, challenge.nonce, signature),
    ).rejects.toThrow('does not match');
  });

  it('rejects a signature from the wrong wallet', async () => {
    const challenge = createChallenge(account.address);
    const signature = await privateKeyToAccount(
      generatePrivateKey(),
    ).signMessage({ message: challenge.message });

    await expect(
      verifyChallenge(account.address, challenge.nonce, signature),
    ).rejects.toThrow('could not be verified');
  });

  it('expires challenges and sessions', async () => {
    vi.useFakeTimers();
    const { challenge, signature } = await signIn();
    const session = await verifyChallenge(
      account.address,
      challenge.nonce,
      signature,
    );
    const late = await signIn();

    vi.advanceTimersByTime(5 * 60_000);
    await expect(
      verifyChallenge(account.address, late.challenge.nonce, late.signature),
    ).rejects.toThrow('expired');

    vi.advanceTimersByTime(7 * 24 * 60 * 60_000);
    expect(getSession(`Bearer ${session.token}`)).toBeNull();
  });

  it('revokes a session on logout', async () => {
    const { challenge, signature } = await signIn();
    const { token } = await verifyChallenge(
      account.address,
      challenge.nonce,
      signature,
    );
    revokeSession(`Bearer ${token}`);

    expect(getSession(`Bearer ${token}`)).toBeNull();
  });

  it('refuses a short secret', () => {
    expect(() => configureAuth({ sessionSecret: 'short' })).toThrow(
      'at least 32',
    );
  });
});
