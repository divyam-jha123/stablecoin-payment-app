import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { WalletAccount } from './wallet-store';
import type { StageListener } from './wallet-store';
import { walletFlowLog } from './wallet-flow-log';

const tokenKey = 'traveller.auth.session.v1';
const sessionFreshMs = 30_000;
let recentSession: {
  token: string;
  address: string;
  checkedAt: number;
  expiresAt: number;
} | null = null;
const pendingSessions = new Map<string, Promise<boolean>>();

class SessionHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
function getApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri;
  if (host) return `http://${new URL(`http://${host}`).hostname}:3000`;
  throw new Error('Set EXPO_PUBLIC_API_URL to your payment service address.');
}

async function request<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
    const payload = (await response.json().catch(() => null)) as
      T | { error?: { message?: string } } | null;
    if (!response.ok) {
      const message =
        payload !== null &&
        typeof payload === 'object' &&
        'error' in payload &&
        payload.error?.message
          ? payload.error.message
          : 'The backend session could not be updated.';
      throw new SessionHttpError(message, response.status);
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

async function readToken() {
  return SecureStore.getItemAsync(tokenKey);
}

async function clearToken() {
  await SecureStore.deleteItemAsync(tokenKey);
}

export async function restoreSession(account: WalletAccount) {
  const token = await readToken();
  if (!token) return false;
  const address = account.address.toLowerCase();
  if (
    recentSession?.token === token &&
    recentSession.address === address &&
    recentSession.expiresAt > Date.now() &&
    Date.now() - recentSession.checkedAt < sessionFreshMs
  )
    return true;
  const key = `${address}:${token}`;
  const pending = pendingSessions.get(key);
  if (pending) return pending;
  const check = (async () => {
    try {
      const result = await request<{
        data: { address: string; expiresAt: number };
      }>('/v1/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const valid =
        result.data.address.toLowerCase() === address &&
        result.data.expiresAt > Date.now();
      if (valid)
        recentSession = {
          token,
          address,
          checkedAt: Date.now(),
          expiresAt: result.data.expiresAt,
        };
      return valid;
    } catch (error) {
      if (error instanceof SessionHttpError && error.status === 401) {
        if ((await readToken()) === token) {
          await clearToken();
          recentSession = null;
        }
        return false;
      }
      throw error;
    } finally {
      pendingSessions.delete(key);
    }
  })();
  pendingSessions.set(key, check);
  return check;
}

export async function authenticateWallet(
  account: WalletAccount,
  signMessage: (
    message: string,
    onStage?: StageListener,
  ) => Promise<`0x${string}`>,
  onStage?: StageListener,
) {
  onStage?.('checking-session');
  walletFlowLog.info('Checking for an existing backend session');
  if (await restoreSession(account)) {
    walletFlowLog.info('Existing backend session is valid');
    return;
  }
  const challenge = await requestSignInChallenge(account.address, onStage);
  onStage?.('signing');
  const signature = await signMessage(challenge.message, onStage);
  await verifySignInChallenge(account, challenge, signature, onStage);
}

export type SignInChallenge = {
  nonce: string;
  message: string;
  expiresAt: number;
};

export async function requestSignInChallenge(
  address: string,
  onStage?: StageListener,
): Promise<SignInChallenge> {
  onStage?.('challenge');
  walletFlowLog.info('Requesting sign-in challenge from backend');
  const challenge = await request<{ data: SignInChallenge }>(
    '/v1/auth/challenge',
    {
      method: 'POST',
      body: JSON.stringify({ address }),
    },
  );
  walletFlowLog.info('Sign-in challenge received');
  if (challenge.data.expiresAt <= Date.now()) {
    throw new Error('The sign-in request expired. Please try again.');
  }
  return challenge.data;
}

export async function verifySignInChallenge(
  account: WalletAccount,
  challenge: SignInChallenge,
  signature: `0x${string}`,
  onStage?: StageListener,
) {
  onStage?.('verifying');
  walletFlowLog.info('Submitting signature for backend verification');
  const result = await request<{
    data: { token: string; address: string; expiresAt: number };
  }>('/v1/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      address: account.address,
      nonce: challenge.nonce,
      signature,
    }),
  });
  if (result.data.address.toLowerCase() !== account.address.toLowerCase())
    throw new Error('The signed-in account does not match MetaMask.');
  walletFlowLog.info('Backend verified wallet signature');
  onStage?.('saving');
  await SecureStore.setItemAsync(tokenKey, result.data.token);
  recentSession = {
    token: result.data.token,
    address: account.address.toLowerCase(),
    checkedAt: Date.now(),
    expiresAt: result.data.expiresAt,
  };
  walletFlowLog.info('Backend session saved on device');
}

export async function logoutSession() {
  const token = await readToken();
  try {
    if (token) {
      await request('/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    recentSession = null;
    await clearToken();
  }
}
