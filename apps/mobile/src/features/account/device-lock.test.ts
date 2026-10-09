import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  getEnrolledLevelAsync: vi.fn(),
  authenticateAsync: vi.fn(),
}));
vi.mock('expo-local-authentication', () => ({
  ...native,
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_STRONG: 3 },
}));

const { authenticate, phoneHasLock } = await import('./device-lock');

beforeEach(() => vi.resetAllMocks());

describe('native device authentication', () => {
  it('accepts a phone passcode even when no biometrics are enrolled', async () => {
    native.getEnrolledLevelAsync.mockResolvedValue(1);
    expect(await phoneHasLock()).toBe(true);
    native.getEnrolledLevelAsync.mockResolvedValue(0);
    expect(await phoneHasLock()).toBe(false);
  });

  it('allows the operating system to fall back to the phone passcode', async () => {
    native.authenticateAsync.mockResolvedValue({ success: true });
    expect(await authenticate('Sign in to TravelPe')).toBe(true);
    expect(native.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Sign in to TravelPe',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
    });
  });

  it('does not unlock when native authentication is cancelled or fails', async () => {
    native.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'user_cancel',
    });
    expect(await authenticate('Sign in to TravelPe')).toBe(false);
    native.authenticateAsync.mockRejectedValue(new Error('Unavailable'));
    await expect(authenticate('Sign in to TravelPe')).rejects.toThrow(
      'Unavailable',
    );
  });
});
