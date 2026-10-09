/**
 * What the Security screen knows about the account. `null` means a check is
 * still loading; a failed check is reported as `false`.
 */
export type SecurityChecks = {
  hasPin: boolean | null;
  phoneLock: boolean | null;
};

export type SecuritySummary =
  | { state: 'loading'; title: string; subtitle: string }
  | { state: 'secure'; title: string; subtitle: string }
  | { state: 'missing-pin' | 'missing-lock'; title: string; subtitle: string };

/** The banner at the foot of the Security screen. */
export function securitySummary(checks: SecurityChecks): SecuritySummary {
  if (checks.hasPin === null || checks.phoneLock === null)
    return {
      state: 'loading',
      title: 'Checking your security',
      subtitle: 'One moment…',
    };
  if (!checks.hasPin)
    return {
      state: 'missing-pin',
      title: 'Finish securing your account',
      subtitle: 'Set a payment PIN to approve payments',
    };
  if (!checks.phoneLock)
    return {
      state: 'missing-lock',
      title: 'Finish securing your account',
      subtitle: 'Set a screen lock in your phone settings',
    };
  return {
    state: 'secure',
    title: 'Your account is secure',
    subtitle: 'Payment PIN and app lock are active',
  };
}
