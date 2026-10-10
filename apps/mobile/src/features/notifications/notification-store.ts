import { useMemo, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uiPreviewEnabled } from '../../ui-preview';
import { previewNotifications } from '../../preview-data';
import { useLoginActivity } from '../account/login-activity-store';
import { useSimulatedPayments } from '../payment/simulated-payment-store';
import {
  buildNotifications,
  createReadStore,
  type AppNotification,
} from './notifications';

export const notificationReadStore = createReadStore(AsyncStorage);
void notificationReadStore.hydrate();

const PREVIEW_OWNER = 'ui-preview';

/**
 * Notifications for the signed-in wallet, or sample ones in the UI preview,
 * with whether each one has been read.
 */
export function useNotifications(address: string | undefined) {
  useSyncExternalStore(
    notificationReadStore.subscribe,
    notificationReadStore.getSnapshot,
  );
  const owner = uiPreviewEnabled ? PREVIEW_OWNER : address?.toLowerCase();
  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  const { entries } = useLoginActivity(address);

  const items: readonly AppNotification[] = useMemo(
    () =>
      uiPreviewEnabled
        ? [...buildNotifications(payments, []), ...previewNotifications].sort(
            (a, b) => b.at - a.at,
          )
        : buildNotifications(payments, entries),
    [payments, entries],
  );
  const withState = items.map((item) => ({
    ...item,
    unread: owner ? !notificationReadStore.isRead(owner, item.id) : false,
  }));
  return {
    items: withState,
    unreadCount: withState.filter((item) => item.unread).length,
    markRead: (ids: readonly string[]) => {
      if (owner) notificationReadStore.markRead(owner, ids);
    },
  };
}
