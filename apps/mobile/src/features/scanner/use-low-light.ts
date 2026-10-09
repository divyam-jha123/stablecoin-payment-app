import { useEffect, useState } from 'react';
import { LightSensor } from 'expo-sensors';
import { initialLowLightState, nextLowLightState } from './low-light';

const UPDATE_INTERVAL_MS = 500;

/**
 * Reports whether the phone's ambient light sensor reads dim. The sensor sits
 * on the front of the phone, so it measures room light rather than the QR.
 * Always false when disabled or when the device has no light sensor.
 */
export function useLowLight(enabled: boolean): boolean {
  const [lowLight, setLowLight] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLowLight(false);
      return;
    }

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    let state = initialLowLightState;

    void LightSensor.isAvailableAsync()
      .then((available) => {
        if (!available || cancelled) return;
        LightSensor.setUpdateInterval(UPDATE_INTERVAL_MS);
        subscription = LightSensor.addListener(({ illuminance }) => {
          state = nextLowLightState(state, illuminance, Date.now());
          setLowLight(state.lowLight);
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return lowLight;
}
