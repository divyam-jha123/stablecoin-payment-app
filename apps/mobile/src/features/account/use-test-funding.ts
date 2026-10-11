import { useEffect, useRef, useState } from 'react';
import { walletStore } from './metamask';
import { TEMPO_CHAIN, tempoService } from './tempo';
import { walletError } from './wallet-store';

/**
 * Requests Tempo testnet pathUSD for the connected wallet, at most once a
 * minute, and refreshes the balance afterwards.
 */
export function useTestFunding({
  address,
  enabled,
  refetch,
}: {
  address: string | undefined;
  enabled: boolean;
  refetch: () => Promise<unknown>;
}) {
  const [funding, setFunding] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{
    address: string;
    text: string;
  } | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function fund() {
    const current = walletStore.getSnapshot();
    if (
      !enabled ||
      !address ||
      current.busy ||
      lock.current ||
      cooldown ||
      current.account?.address !== address ||
      current.account.chainId !== TEMPO_CHAIN.id
    )
      return;
    lock.current = true;
    setFunding(true);
    setCooldown(60);
    setNotice(null);
    try {
      await tempoService.fund(address);
      setNotice({
        address,
        text: 'Test funds requested. Your balance updates automatically.',
      });
      if (walletStore.getSnapshot().account?.address === address)
        await refetch();
    } catch (cause) {
      setNotice({
        address,
        text: walletError(cause) + ' Please try again after the cooldown.',
      });
    } finally {
      lock.current = false;
      setFunding(false);
    }
  }

  return {
    fund,
    funding,
    cooldown,
    /** Result of the last request, only for the wallet that made it. */
    notice: notice && notice.address === address ? notice.text : null,
    label: funding ? 'Requesting…' : cooldown ? `Wait ${cooldown}s` : null,
  };
}
