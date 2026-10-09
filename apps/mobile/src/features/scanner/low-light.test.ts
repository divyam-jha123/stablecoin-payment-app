import { describe, expect, it } from 'vitest';
import {
  DIM_HOLD_MS,
  initialLowLightState,
  nextLowLightState,
} from './low-light';

describe('low light detection', () => {
  it('waits for a sustained dim reading before reporting low light', () => {
    const first = nextLowLightState(initialLowLightState, 5, 0);
    expect(first.lowLight).toBe(false);
    expect(nextLowLightState(first, 5, DIM_HOLD_MS - 1).lowLight).toBe(false);
    expect(nextLowLightState(first, 5, DIM_HOLD_MS).lowLight).toBe(true);
  });

  it('restarts the wait when a bright reading interrupts', () => {
    const dim = nextLowLightState(initialLowLightState, 5, 0);
    const bright = nextLowLightState(dim, 100, 500);
    const dimAgain = nextLowLightState(bright, 5, 600);
    expect(nextLowLightState(dimAgain, 5, DIM_HOLD_MS).lowLight).toBe(false);
  });

  it('stays in low light until the reading is clearly bright', () => {
    const low = { lowLight: true, dimSince: 0 };
    expect(nextLowLightState(low, 30, 5_000).lowLight).toBe(true);
    expect(nextLowLightState(low, 41, 5_000).lowLight).toBe(false);
  });
});
