import { useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { AppIcon, colors } from './payment-ui';
import { homeTheme } from '../theme/home';
import { walletStore } from '../features/account/metamask';
import { useExplorer } from '../features/account/use-explorer';
import { useProfileDetails } from '../features/account/profile-details-store';
import {
  profileAvatarColor,
  profileInitial,
} from '../features/account/profile-details';
import { formatPathUsdAtomic } from '../features/payment/amount';
import {
  paymentPathUsdAtomic,
  type SimulatedPayment,
} from '../features/payment/simulated-payments';
import { formatInr, shareReceipt } from '../features/payment/receipt';

/** "Divyam Jha" -> "Divyam J.", so a shared image shows no full surname. */
function shortName(name: string) {
  const [first = '', ...rest] = name.trim().split(/\s+/u);
  const last = rest.at(-1);
  return last ? `${first} ${Array.from(last)[0]!.toUpperCase()}.` : first;
}

function receiptDate(createdAt: number) {
  const date = new Date(createdAt);
  return `${date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} · ${date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function Wordmark({ size }: { size: number }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }]}>
      Travel<Text style={styles.wordmarkPe}>Pe</Text>
    </Text>
  );
}

function Row({
  label,
  value,
  strong,
  boldValue,
  last,
}: {
  label: string;
  value: string;
  strong?: boolean;
  boldValue?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={strong ? styles.strongLabel : styles.label}>{label}</Text>
      <Text
        numberOfLines={1}
        style={[styles.value, (strong || boldValue) && styles.strongValue]}
      >
        {value}
      </Text>
    </View>
  );
}

/** The image people see when a receipt is shared to another app. */
function ShareReceiptCard({
  payment,
  from,
}: {
  payment: SimulatedPayment;
  from: string;
}) {
  const total = `${Number(
    formatPathUsdAtomic(paymentPathUsdAtomic(payment)),
  ).toFixed(2)} ${payment.token}`;
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.top}>
          <Wordmark size={30} />
          <View style={styles.pill}>
            <Text style={styles.pillText}>DEMO RECEIPT</Text>
          </View>
        </View>
        <View style={styles.hairline} />
        <View style={styles.hero}>
          <View style={styles.check}>
            <AppIcon name="check" size={36} color="#ffffff" />
          </View>
          <Text style={styles.completed}>Payment completed</Text>
          <Text style={styles.amount}>₹{formatInr(payment.inrAmount)}</Text>
          <View style={styles.payee}>
            <View style={styles.avatarRing}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: profileAvatarColor(payment.merchantName) },
                ]}
              >
                <Text style={styles.initial}>
                  {profileInitial(payment.merchantName)}
                </Text>
              </View>
            </View>
            <View style={styles.payeeCopy}>
              <Text style={styles.paidTo}>Paid to</Text>
              <Text numberOfLines={1} style={styles.merchant}>
                {payment.merchantName}
              </Text>
              <Text style={styles.date}>{receiptDate(payment.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.table}>
          <Row label="From" value={from} boldValue />
          <Row label="To" value={payment.merchantName} boldValue />
          <Row label="Payment method" value={`${payment.token} balance`} />
          <Row label="Total paid" value={total} strong />
          <Row label="Reference" value={payment.reference} last />
        </View>
        <View style={styles.hairline} />
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Wordmark size={24} />
            <View style={styles.footerRule} />
            <Text style={styles.footerLabel}>Payment receipt</Text>
          </View>
          <Text style={styles.disclaimer}>
            UPI payout simulated • No real money transferred
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Shares a payment as the TravelPe receipt image, through the phone's share
 * sheet (WhatsApp, Instagram, Telegram and so on). Render `card` anywhere in
 * the screen; it is drawn off screen only to be captured. Falls back to a
 * text receipt when the image cannot be made.
 */
export function useReceiptShare(payment: SimulatedPayment | undefined) {
  const address = useSyncExternalStore(
    walletStore.subscribe,
    () => walletStore.getSnapshot().account?.address,
  );
  const { profile } = useExplorer();
  const details = useProfileDetails(address);
  const from = shortName(details?.name || profile?.name || '') || 'Traveller';
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!payment || busy) return;
    setBusy(true);
    try {
      if (!ref.current || !(await Sharing.isAvailableAsync()))
        throw new Error('Image sharing unavailable');
      const uri = await captureRef(ref.current, {
        format: 'png',
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share TravelPe receipt',
        UTI: 'public.png',
      });
    } catch {
      shareReceipt(payment);
    } finally {
      setBusy(false);
    }
  }

  const card = payment ? (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.offscreen}
    >
      <ShareReceiptCard payment={payment} from={from} />
    </View>
  ) : null;

  return { share, busy, card };
}

const CARD_WIDTH = 380;

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: 0, left: -10_000 },
  backdrop: { width: CARD_WIDTH + 40, padding: 20, backgroundColor: '#e4f0ff' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 14,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  wordmark: { color: colors.ink, fontWeight: '800', letterSpacing: -0.5 },
  wordmarkPe: { color: homeTheme.colors.primary },
  pill: {
    borderRadius: homeTheme.radius.pill,
    backgroundColor: '#e8f2ff',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: {
    color: homeTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  hairline: { height: 1, backgroundColor: homeTheme.colors.border },
  hero: { alignItems: 'center', gap: 6 },
  check: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#13a14a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completed: { color: '#13a14a', fontSize: 20, fontWeight: '700' },
  amount: { color: colors.ink, fontSize: 56, fontWeight: '800' },
  payee: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#e3efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#ffffff', fontSize: 28, fontWeight: '600' },
  payeeCopy: { maxWidth: 220 },
  paidTo: { color: homeTheme.colors.muted, fontSize: 14 },
  merchant: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  date: { color: homeTheme.colors.muted, fontSize: 14 },
  table: {
    borderRadius: 14,
    backgroundColor: '#eef5ff',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#d6e4f7' },
  label: { color: homeTheme.colors.muted, fontSize: 14 },
  strongLabel: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  value: { color: colors.ink, fontSize: 14, flexShrink: 1 },
  strongValue: { fontWeight: '700' },
  footer: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerRule: {
    width: 1,
    height: 22,
    backgroundColor: homeTheme.colors.border,
  },
  footerLabel: { color: homeTheme.colors.muted, fontSize: 13 },
  disclaimer: { color: homeTheme.colors.muted, fontSize: 10 },
});
