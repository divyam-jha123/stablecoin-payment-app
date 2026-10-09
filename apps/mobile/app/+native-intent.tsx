/** Wallet callbacks wake the existing flow; they never grant authentication. */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | null {
  try {
    const url = new URL(path, 'travellerpay://');
    const isWalletReturn =
      (url.protocol === 'travellerpay:' && url.hostname === 'wallet-return') ||
      url.pathname === '/wallet-return' ||
      url.pathname === '/--/wallet-return';
    // Preserve the pending Connect/transaction screen and its in-memory work.
    // After a process restart, use the normal splash and authentication gate.
    if (isWalletReturn) return initial ? '/' : null;
  } catch {
    // Leave unrelated or malformed links to the router's normal handling.
  }
  return path;
}
