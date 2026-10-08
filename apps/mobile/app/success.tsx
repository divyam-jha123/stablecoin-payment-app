import { useState, useSyncExternalStore } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';
import { previewSamplePayment } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';
import { formatPathUsdAtomic } from '../src/features/payment/amount';
import { simulatedPaymentStore } from '../src/features/payment/simulated-payment-store';
import {
  formatPaymentTime,
  paymentPathUsdAtomic,
  type SimulatedPayment,
} from '../src/features/payment/simulated-payments';

const GREEN = '#3fa75a';
const HALO = 196;
const BADGE = 140;
// Short celebratory strokes around the badge: [angle in degrees, opacity].
const BURST: readonly (readonly [number, number])[] = [
  [-150, 1],
  [180, 0.45],
  [150, 0.35],
  [-30, 0.45],
  [0, 1],
  [30, 0.35],
];
const BURST_RADIUS = HALO / 2 + 30;
const SIMULATED_NOTICE =
  'Demo payment on the Tempo testnet. INR settlement is simulated; no INR reached the merchant.';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatInr(amount: string) {
  return Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SuccessBadge() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.badgeArea}
    >
      {BURST.map(([angle, opacity]) => {
        const radians = (angle * Math.PI) / 180;
        return (
          <View
            key={angle}
            style={[
              styles.burst,
              {
                opacity,
                transform: [
                  { translateX: Math.cos(radians) * BURST_RADIUS },
                  { translateY: Math.sin(radians) * BURST_RADIUS },
                  { rotate: `${angle}deg` },
                ],
              },
            ]}
          />
        );
      })}
      <View style={styles.halo}>
        <View style={styles.badge}>
          <AppIcon name="check" color="#ffffff" size={72} />
        </View>
      </View>
    </View>
  );
}

function shareReceipt(payment: SimulatedPayment) {
  const lines = [
    'TravelPe payment receipt',
    `Paid ₹${formatInr(payment.inrAmount)} to ${payment.merchantName}`,
    payment.location,
    `Debited: ${formatPathUsdAtomic(paymentPathUsdAtomic(payment))} ${payment.token}`,
    `Reference: ${payment.reference}`,
    formatPaymentTime(payment.createdAt),
    '',
    SIMULATED_NOTICE,
  ];
  void Share.share({ message: lines.join('\n') }).catch(() => undefined);
}

export default function Success() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const payments = useSyncExternalStore(
    simulatedPaymentStore.subscribe,
    simulatedPaymentStore.getSnapshot,
  );
  const payment = id
    ? payments.find((item) => item.id === id)
    : uiPreviewEnabled
      ? (payments[0] ?? previewSamplePayment)
      : undefined;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        {/* Going back would reopen a paid review, so leave to the wallet. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to wallet"
          hitSlop={8}
          onPress={() => router.replace('/home')}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="chevron-left" size={22} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Help"
          hitSlop={8}
          onPress={() => Alert.alert('About this payment', SIMULATED_NOTICE)}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="help" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {payment ? (
          <>
            <SuccessBadge />
            <Text accessibilityRole="header" style={styles.title}>
              Payment successful
            </Text>
            <Text style={styles.amount}>₹{formatInr(payment.inrAmount)}</Text>
            <Text style={styles.paidTo} numberOfLines={1}>
              Paid to {payment.merchantName}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              {payment.location}
            </Text>

            <View style={styles.merchantCard}>
              <View style={styles.merchantIcon}>
                <AppIcon name="store" size={26} color={colors.accent} />
              </View>
              <View style={styles.merchantCopy}>
                <Text style={styles.merchantName} numberOfLines={1}>
                  {payment.merchantName}
                </Text>
                <Text style={styles.merchantLocation} numberOfLines={1}>
                  {payment.location}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsOpen }}
                onPress={() => setDetailsOpen((open) => !open)}
                style={({ pressed }) => [
                  styles.detailsPill,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.detailsText}>
                  {detailsOpen ? 'Hide Details' : 'View Details'}
                </Text>
                <AppIcon
                  name={detailsOpen ? 'chevron-down' : 'arrow'}
                  size={16}
                  color={colors.accent}
                />
              </Pressable>
            </View>

            {detailsOpen ? (
              <View style={styles.summary}>
                <SummaryRow label="Reference ID" value={payment.reference} />
                <SummaryRow
                  label="Debited"
                  value={`${formatPathUsdAtomic(paymentPathUsdAtomic(payment))} ${payment.token}`}
                />
                <SummaryRow label="Settlement" value="Simulated" />
                <SummaryRow
                  label="Date & time"
                  value={formatPaymentTime(payment.createdAt)}
                />
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.emptyIcon}>
              <AppIcon name="wallet" color={colors.accent} size={48} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              No payment completed
            </Text>
            <Text style={styles.paidTo}>
              No payment was found. No funds were moved and no merchant received
              INR.
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/home')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Done</Text>
          <View style={styles.buttonArrow}>
            <AppIcon name="arrow" size={24} color="#ffffff" />
          </View>
        </Pressable>
        {payment ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => shareReceipt(payment)}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon name="share" size={20} color={colors.accent} />
            <Text style={styles.secondaryText}>Share receipt</Text>
          </Pressable>
        ) : null}
      </View>

      <PreviewFlowBar
        status="Success"
        actions={[
          { label: 'Details ›', onPress: () => router.push('/details') },
          { label: 'Failed ›', onPress: () => router.replace('/failed') },
          { label: 'Activity ›', onPress: () => router.replace('/activity') },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f2f6fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  badgeArea: {
    width: HALO + 90,
    height: HALO + 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  halo: {
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: '#eef7f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
  },
  amount: {
    color: colors.ink,
    fontSize: 46,
    fontWeight: '800',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  paidTo: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 330,
  },
  location: { color: colors.muted, fontSize: 15, marginTop: 4 },
  merchantCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 22,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e3ebf7',
    backgroundColor: '#f8fbff',
  },
  merchantIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e3edfb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantCopy: { flex: 1, gap: 2 },
  merchantName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  merchantLocation: { color: colors.muted, fontSize: 14 },
  detailsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6efff',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailsText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  summary: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#e3ebf7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: 10,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  label: { color: colors.muted, fontSize: 13 },
  value: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    marginLeft: 12,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e7f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 12 },
  button: {
    backgroundColor: '#2f6bff',
    minHeight: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 20, fontWeight: '600' },
  buttonArrow: { position: 'absolute', right: 24 },
  secondary: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#dbe6f7',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontSize: 17, fontWeight: '600' },
});
