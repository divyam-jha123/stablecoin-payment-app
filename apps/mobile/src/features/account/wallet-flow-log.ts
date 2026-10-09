let attempt = 0;
let step = 0;
let tracking = false;
// Steps of the current attempt, attached to its first error so the cause is
// visible even when only ERROR lines are copied from the terminal.
let trail: string[] = [];
let trailShown = false;
let attemptStartedAt = 0;
let lastStepAt = 0;
const enabled = typeof __DEV__ !== 'undefined' && __DEV__;

function prefix() {
  const now = Date.now();
  const timing = tracking
    ? ` +${now - attemptStartedAt}ms (step +${now - lastStepAt}ms)`
    : '';
  lastStepAt = now;
  return `[MetaMask flow #${attempt || '-'} step ${++step}${timing}]`;
}

function record(message: string) {
  trail.push(`${step}. ${message}`);
}

function takeTrail() {
  if (trailShown || trail.length === 0) return '';
  trailShown = true;
  return `\n  Earlier steps:\n    ${trail.join('\n    ')}`;
}

function safeError(error: unknown) {
  if (typeof error !== 'object' || error === null) return 'Unknown error';
  const name = 'name' in error ? String(error.name) : 'Error';
  const code = 'code' in error ? String(error.code) : undefined;
  const message =
    'message' in error
      ? String(error.message)
          .replace(/https?:\/\/\S+|metamask:\/\/\S+/gi, '[link]')
          .replace(/0x[\da-f]{8,}/gi, '[hex]')
      : undefined;
  return [name, code && `code=${code}`, message].filter(Boolean).join(': ');
}

export const walletFlowLog = {
  begin() {
    if (!enabled) return;
    attempt += 1;
    step = 0;
    tracking = true;
    trail = [];
    trailShown = false;
    attemptStartedAt = Date.now();
    lastStepAt = attemptStartedAt;
    console.info(`${prefix()} Connect button pressed`);
    record('Connect button pressed');
  },
  appState(state: string) {
    if (!enabled || !tracking) return;
    console.info(`${prefix()} TravelPay app state: ${state}`);
    record(`TravelPay app state: ${state}`);
  },
  stop() {
    tracking = false;
  },
  info(message: string) {
    if (!enabled) return;
    console.info(`${prefix()} ${message}`);
    record(message);
  },
  error(message: string, cause: unknown) {
    if (enabled)
      console.error(
        `${prefix()} ${message}: ${safeError(cause)}${takeTrail()}`,
      );
  },
};
