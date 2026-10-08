import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSimulatedPaymentStore,
  paymentsForAddress,
} from './simulated-payments';

export const simulatedPaymentStore = createSimulatedPaymentStore(AsyncStorage);
void simulatedPaymentStore.hydrate();

export function useSimulatedPayments(address: string | null | undefined) {
  const payments = useSyncExternalStore(
    simulatedPaymentStore.subscribe,
    simulatedPaymentStore.getSnapshot,
  );
  return paymentsForAddress(payments, address);
}
