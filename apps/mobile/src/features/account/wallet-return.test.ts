import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirectSystemPath } from '../../../app/+native-intent';

const mocks = vi.hoisted(() => ({
  state: { currentState: 'background' },
  openURL: vi.fn(async () => undefined),
}));
vi.mock('react-native', () => ({
  AppState: mocks.state,
  Linking: { openURL: mocks.openURL },
}));
vi.mock('expo-linking', () => ({
  createURL: (path: string) => `travellerpay://${path}`,
}));
import { returnFromWallet } from './wallet-return';

beforeEach(() => {
  mocks.state.currentState = 'background';
  mocks.openURL.mockReset().mockResolvedValue(undefined);
});

describe('return from MetaMask', () => {
  it('requests foreground without changing the current route', async () => {
    await returnFromWallet();
    expect(mocks.openURL).toHaveBeenCalledWith('travellerpay://wallet-return');
    expect(
      redirectSystemPath({
        path: 'travellerpay://wallet-return',
        initial: false,
      }),
    ).toBeNull();
  });
  it('does not reopen the app when already active', async () => {
    mocks.state.currentState = 'active';
    await returnFromWallet();
    expect(mocks.openURL).not.toHaveBeenCalled();
  });
  it('preserves the auth gate after a cold-start callback', () => {
    expect(
      redirectSystemPath({
        path: 'travellerpay://wallet-return',
        initial: true,
      }),
    ).toBe('/');
  });
  it('handles Expo Go callbacks and leaves ordinary routes alone', () => {
    expect(
      redirectSystemPath({
        path: 'exp://192.168.1.2:8081/--/wallet-return',
        initial: false,
      }),
    ).toBeNull();
    expect(redirectSystemPath({ path: '/profile', initial: false })).toBe(
      '/profile',
    );
  });
  it('does not fail sign-in if the OS declines to foreground the app', async () => {
    mocks.openURL.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(returnFromWallet()).resolves.toBeUndefined();
  });
});
