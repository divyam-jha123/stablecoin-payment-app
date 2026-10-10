import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { uiPreviewEnabled } from '../../ui-preview';
import { createReceivedTransfers } from './received-transfers';

export const receivedTransfers = createReceivedTransfers(AsyncStorage);

/**
 * pathUSD this wallet received on the Tempo testnet, refreshed every 15 s
 * like the balance. Empty in the UI preview, which uses sample activity.
 */
export function useReceivedTransfers(address: string | null | undefined) {
  const query = useQuery({
    queryKey: ['tempo-received', address?.toLowerCase()],
    queryFn: () => receivedTransfers.sync(address as Address),
    enabled: !uiPreviewEnabled && Boolean(address),
    retry: false,
    staleTime: 0,
    refetchInterval: 15_000,
  });
  return query.data ?? [];
}
