/** Coming back after this long in the background asks to unlock again. */
export const RELOCK_AFTER_MS = 30_000;

/**
 * Whether returning to the app should lock it. Short trips away, such as
 * approving something in MetaMask, don't re-lock.
 */
export function shouldRelock(
  backgroundedAt: number | null,
  now: number,
  relockAfterMs = RELOCK_AFTER_MS,
) {
  return backgroundedAt !== null && now - backgroundedAt >= relockAfterMs;
}
