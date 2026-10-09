// Ambient light thresholds in lux. The gap between them stops the state
// flickering when a reading hovers around one value.
export const DIM_BELOW_LUX = 15;
export const BRIGHT_ABOVE_LUX = 40;
// A reading must stay dim this long before it counts as low light.
export const DIM_HOLD_MS = 1_000;

export type LowLightState = {
  lowLight: boolean;
  dimSince: number | null;
};

export const initialLowLightState: LowLightState = {
  lowLight: false,
  dimSince: null,
};

export function nextLowLightState(
  state: LowLightState,
  illuminance: number,
  now: number,
): LowLightState {
  if (state.lowLight) {
    return illuminance > BRIGHT_ABOVE_LUX ? initialLowLightState : state;
  }
  if (illuminance >= DIM_BELOW_LUX) return initialLowLightState;
  const dimSince = state.dimSince ?? now;
  return { lowLight: now - dimSince >= DIM_HOLD_MS, dimSince };
}
