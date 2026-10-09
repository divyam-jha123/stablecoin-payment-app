import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  preview: false,
  hasPin: vi.fn(),
  adopt: vi.fn(),
  clear: vi.fn(),
  load: vi.fn(),
  google: vi.fn(),
}));
vi.mock('../../ui-preview', () => ({
  get uiPreviewEnabled() {
    return state.preview;
  },
}));
vi.mock('./payment-pin', () => ({
  pinStore: {
    hasPin: state.hasPin,
    adopt: state.adopt,
    clear: state.clear,
  },
  PREVIEW_PIN_OWNER: 'preview',
  DEVICE_PIN_OWNER: 'device',
}));
vi.mock('./google-account', () => ({
  googleAccount: { load: state.google },
}));
vi.mock('./remembered-account', () => ({
  rememberedAccount: { load: state.load },
}));
const { entryRoute, hasReturningUser, routeAfterSignOut } =
  await import('./returning-user');

beforeEach(() => {
  vi.resetAllMocks();
  state.preview = false;
  state.google.mockResolvedValue(null);
  state.adopt.mockResolvedValue(undefined);
});

describe('returning sign-in', () => {
  it('shows onboarding only when neither account is signed in', async () => {
    state.load.mockResolvedValue(null);
    expect(await entryRoute()).toBe('/onboarding');
    expect(await hasReturningUser()).toBe(false);
  });

  it('returns wallet users to Home without requiring PIN setup', async () => {
    state.load.mockResolvedValue('0x123');
    state.hasPin.mockResolvedValue(false);
    expect(await entryRoute()).toBe('/home');
    expect(await hasReturningUser()).toBe(true);
    expect(state.adopt).toHaveBeenCalledWith('0x123', 'device');
  });

  it('recognizes completed preview setup independently of the wallet', async () => {
    state.preview = true;
    state.hasPin.mockResolvedValue(true);
    expect(await hasReturningUser()).toBe(true);
    expect(state.hasPin).toHaveBeenCalledWith('preview');
    state.hasPin.mockResolvedValue(false);
    expect(await hasReturningUser()).toBe(false);
    expect(state.load).not.toHaveBeenCalled();
  });

  it('resumes unfinished Google PIN setup and opens Home once it is complete', async () => {
    state.google.mockResolvedValue({ sub: '1', name: 'Asha', email: 'a@b.co' });
    state.hasPin.mockResolvedValue(false);
    expect(await entryRoute()).toBe('/pin-setup');
    expect(await hasReturningUser()).toBe(true);
    state.hasPin.mockResolvedValue(true);
    expect(await entryRoute()).toBe('/home');
    expect(state.hasPin).toHaveBeenCalledWith('device');
  });

  it('uses the preview PIN after Google signup in preview mode', async () => {
    state.preview = true;
    state.google.mockResolvedValue({ sub: 'preview' });
    state.hasPin.mockResolvedValue(false);
    expect(await entryRoute()).toBe('/pin-setup');
    expect(state.hasPin).toHaveBeenCalledWith('preview');
  });

  it('preserves the PIN and returns Home when MetaMask disconnects but Google remains', async () => {
    state.google.mockResolvedValue({ sub: '1' });
    state.load.mockResolvedValue(null);
    expect(await routeAfterSignOut()).toBe('/home');
    expect(state.clear).not.toHaveBeenCalled();
  });

  it('preserves the PIN and returns Home when Google signs out but a wallet remains', async () => {
    state.load.mockResolvedValue('0x123');
    expect(await routeAfterSignOut()).toBe('/home');
    expect(state.clear).not.toHaveBeenCalled();
  });

  it('resets the PIN and returns to onboarding only after both accounts sign out', async () => {
    state.load.mockResolvedValue(null);
    expect(await routeAfterSignOut()).toBe('/onboarding');
    expect(state.clear).toHaveBeenCalledWith('device');
  });

  it('propagates unreadable setup data so it cannot silently bypass sign-in', async () => {
    state.preview = true;
    state.hasPin.mockRejectedValue(new Error('Storage unavailable'));
    await expect(hasReturningUser()).rejects.toThrow('Storage unavailable');
  });
});
