import { AppState } from 'react-native';
import Constants from 'expo-constants';

// Free hosting (for example Render) sleeps the API after idle time and takes
// up to a minute to wake. Pinging /health when the app opens or returns to the
// foreground starts that wake-up before the user signs in or scans.
const wakeIntervalMs = 5 * 60_000;
const wakeTimeoutMs = 60_000;
let lastWakeAt = 0;

function getApiBaseUrl(): string | null {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const expoHost = Constants.expoConfig?.hostUri;
  if (!expoHost) return null;

  try {
    return `http://${new URL(`http://${expoHost}`).hostname}:3000`;
  } catch {
    return null;
  }
}

export function wakeBackend() {
  const baseUrl = getApiBaseUrl();
  const now = Date.now();
  if (!baseUrl || now - lastWakeAt < wakeIntervalMs) return;
  lastWakeAt = now;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), wakeTimeoutMs);
  // Best effort: a failed ping only means the next real request waits longer.
  fetch(`${baseUrl}/health`, { signal: controller.signal })
    .catch(() => {
      lastWakeAt = 0;
    })
    .finally(() => clearTimeout(timer));
}

export function startBackendWake() {
  wakeBackend();
  const listener = AppState.addEventListener('change', (state) => {
    if (state === 'active') wakeBackend();
  });
  return () => listener.remove();
}
