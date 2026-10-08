import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { WalletAccount } from './wallet-store';
import { walletFlowLog } from './wallet-flow-log';

const tokenKey = 'traveller.auth.session.v1';
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
      throw new Error(message);
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
  try {
    const result = await request<{
      data: { address: string; expiresAt: number };
    }>('/v1/auth/session', { headers: { Authorization: `Bearer ${token}` } });
    return (
      result.data.address.toLowerCase() === account.address.toLowerCase() &&
      result.data.expiresAt > Date.now()
    );
  } catch {
    await clearToken();
    return false;
  }
}

export async function authenticateWallet(
  account: WalletAccount,
  signMessage: (message: string) => Promise<`0x${string}`>,
) {
  walletFlowLog.info('Checking for an existing backend session');
  if (await restoreSession(account)) {
    walletFlowLog.info('Existing backend session is valid');
    return;
  }
  walletFlowLog.info('Requesting sign-in challenge from backend');
  const challenge = await request<{
    data: { nonce: string; message: string; expiresAt: number };
  }>('/v1/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ address: account.address }),
  });
  walletFlowLog.info('Sign-in challenge received');
  if (challenge.data.expiresAt <= Date.now()) {
    throw new Error('The sign-in request expired. Please try again.');
  }
  const signature = await signMessage(challenge.data.message);
  walletFlowLog.info('Submitting signature for backend verification');
  const result = await request<{
    data: { token: string; address: string; expiresAt: number };
  }>('/v1/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      address: account.address,
      nonce: challenge.data.nonce,
      signature,
    }),
  });
  walletFlowLog.info('Backend verified wallet signature');
  await SecureStore.setItemAsync(tokenKey, result.data.token);
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
    await clearToken();
  }
}
