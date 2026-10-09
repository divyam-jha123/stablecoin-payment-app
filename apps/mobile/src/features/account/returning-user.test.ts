import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  preview: false,
  hasPin: vi.fn(),
  load: vi.fn(),
}));
vi.mock('../../ui-preview', () => ({
  get uiPreviewEnabled() {
    return state.preview;
  },
}));
vi.mock('./payment-pin', () => ({
  pinStore: { hasPin: state.hasPin },
  PREVIEW_PIN_OWNER: 'preview',
}));
vi.mock('./remembered-account', () => ({
  rememberedAccount: { load: state.load },
}));
const { hasReturningUser } = await import('./returning-user');

beforeEach(() => {
  vi.resetAllMocks();
  state.preview = false;
});

describe('returning sign-in', () => {
  it('requires wallet sign-in and completed PIN setup in the real app', async () => {
    state.load.mockResolvedValue(null);
    expect(await hasReturningUser()).toBe(false);
    state.load.mockResolvedValue('0x123');
    state.hasPin.mockResolvedValue(false);
    expect(await hasReturningUser()).toBe(false);
    state.hasPin.mockResolvedValue(true);
    expect(await hasReturningUser()).toBe(true);
    expect(state.hasPin).toHaveBeenCalledWith('0x123');
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

  it('propagates unreadable setup data so it cannot silently bypass sign-in', async () => {
    state.preview = true;
    state.hasPin.mockRejectedValue(new Error('Storage unavailable'));
    await expect(hasReturningUser()).rejects.toThrow('Storage unavailable');
  });
});
