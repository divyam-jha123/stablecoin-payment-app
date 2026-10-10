import { useSyncExternalStore } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { AppIcon, colors } from '../src/components/payment-ui';
import { homeTheme } from '../src/theme/home';
import {
  profileAvatarColor,
  profileInitial,
} from '../src/features/account/profile-details';
import {
  DEMO_FEE_INR,
  formatPathUsdAtomic,
  ILLUSTRATIVE_INR_PER_PATH_USD,
  requiredPathUsdAtomic,
} from '../src/features/payment/amount';
import { simulatedPaymentStore } from '../src/features/payment/simulated-payment-store';
import {
  paymentPathUsdAtomic,
  type SimulatedPayment,
} from '../src/features/payment/simulated-payments';
import { formatInr, SIMULATED_NOTICE } from '../src/features/payment/receipt';
import { previewReceiptPayments } from '../src/preview-data';
import { parsePaymentRequest } from '../src/features/payment/payment-authorization';
import { openPaymentPin } from '../src/features/payment/open-payment-pin';
import { useReceiptShare } from '../src/components/share-receipt-card';
import { uiPreviewEnabled } from '../src/ui-preview';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Token amounts are shown to two decimals; the payment used the exact one. */
function tokenAmount(atomic: bigint, token: string) {
  return `${Number(formatPathUsdAtomic(atomic)).toFixed(2)} ${token}`;
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

function Row({
  label,
  value,
  strong,
  onCopy,
}: {
  label: string;
  value: string;
  strong?: boolean;
  onCopy?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.totalLabel : styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text
          numberOfLines={1}
          style={strong ? styles.totalValue : styles.value}
        >
          {value}
        </Text>
        {onCopy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Copy ${label}`}
            hitSlop={12}
            onPress={onCopy}
          >
            <AppIcon name="copy" size={20} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** One past payment, opened from a recipient's payment history. */
export default function Receipt() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const payments = useSyncExternalStore(
    simulatedPaymentStore.subscribe,
    simulatedPaymentStore.getSnapshot,
  );
  const payment: SimulatedPayment | undefined = id
    ? (payments.find((item) => item.id === id) ??
      (uiPreviewEnabled
        ? previewReceiptPayments.find((item) => item.id === id)
        : undefined))
    : undefined;
  const receiptShare = useReceiptShare(payment);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/home');

  const copyReference = (reference: string) =>
    void Clipboard.setStringAsync(reference).then(
      () => Alert.alert('Copied', 'TravelPe reference copied.'),
      () => undefined,
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="chevron-left" size={26} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Receipt
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          disabled={!payment}
          hitSlop={8}
          onPress={() =>
            payment &&
            Alert.alert('Receipt', undefined, [
              {
                text: 'Copy reference',
                onPress: () => copyReference(payment.reference),
              },
              { text: 'All activity', onPress: () => router.push('/activity') },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={5} cy={12} r={2} fill={colors.ink} />
            <Circle cx={12} cy={12} r={2} fill={colors.ink} />
            <Circle cx={19} cy={12} r={2} fill={colors.ink} />
          </Svg>
        </Pressable>
      </View>

      {payment ? (
        <ReceiptBody
          payment={payment}
          onCopy={copyReference}
          onShare={() => void receiptShare.share()}
          sharing={receiptShare.busy}
        />
      ) : (
        <View style={styles.missing}>
          <AppIcon name="wallet" color={colors.accent} size={40} />
          <Text style={styles.name}>Receipt not found</Text>
          <Text style={styles.missingCopy}>
            This payment is not saved on this device.
          </Text>
        </View>
      )}
      {receiptShare.card}
    </SafeAreaView>
  );
}

function ReceiptBody({
  payment,
  onCopy,
  onShare,
  sharing,
}: {
  payment: SimulatedPayment;
  onCopy: (reference: string) => void;
  onShare: () => void;
  sharing: boolean;
}) {
  const vpa = payment.merchantVpa;
  const converted = paymentPathUsdAtomic(payment);
  const fee =
    Number(DEMO_FEE_INR) > 0 ? requiredPathUsdAtomic(DEMO_FEE_INR) : 0n;

  // Same merchant, amount and token; the PIN screen approves the repeat.
  const repeat = parsePaymentRequest({
    merchantName: payment.merchantName,
    merchantVpa: vpa,
    location: payment.location,
    inrAmount: payment.inrAmount,
    token: payment.token,
  });
  function payAgain() {
    if (repeat) void openPaymentPin(repeat);
    else
      Alert.alert(
        'Cannot repeat this payment',
        'Scan the merchant QR to pay them again.',
      );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
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
        <Text numberOfLines={1} style={styles.name}>
          {payment.merchantName}
        </Text>
        <Text numberOfLines={1} style={styles.vpa}>
          {vpa ?? payment.location}
        </Text>
        <Text
          accessibilityLabel={`Merchant amount ₹${formatInr(payment.inrAmount)}`}
          style={styles.amount}
        >
          ₹{formatInr(payment.inrAmount)}
        </Text>
        <Text style={styles.amountLabel}>Merchant amount</Text>
        <View style={styles.statusRow}>
          <View style={styles.checkBadge}>
            <AppIcon name="check" size={20} color="#ffffff" />
          </View>
          <Text style={styles.statusText}>Payment completed</Text>
        </View>
        <Text style={styles.date}>{receiptDate(payment.createdAt)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={`Pays ₹${formatInr(payment.inrAmount)} to ${payment.merchantName} again after you enter your PIN`}
          onPress={payAgain}
          style={({ pressed }) => [styles.payAgain, pressed && styles.pressed]}
        >
          <Text style={styles.payAgainText}>Pay again</Text>
        </Pressable>
      </View>

      <View style={styles.breakdown}>
        <Text style={styles.cardTitle}>Payment breakdown</Text>
        <Row
          label="Amount converted"
          value={tokenAmount(converted, payment.token)}
        />
        <Row
          label="Exchange rate"
          value={`1 ${payment.token} = ₹${ILLUSTRATIVE_INR_PER_PATH_USD}`}
        />
        <Row label="Fee" value={tokenAmount(fee, payment.token)} />
        <View style={styles.divider} />
        <Row
          strong
          label="Total paid"
          value={tokenAmount(converted + fee, payment.token)}
        />
        <Text style={styles.note}>Amounts rounded for display.</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.cardTitle}>Transaction details</Text>
        <Row label="Paid with" value={`${payment.token} balance`} />
        <Row
          label="TravelPe reference"
          value={payment.reference}
          onCopy={() => onCopy(payment.reference)}
        />
        {payment.txHash ? (
          <Row
            label="Tempo transaction"
            value={`${payment.txHash.slice(0, 8)}…${payment.txHash.slice(-6)}`}
          />
        ) : null}
        <Row label="UPI payout" value="Simulated" />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Get help', SIMULATED_NOTICE)}
          style={({ pressed }) => [
            styles.actionButton,
            styles.helpButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="help" size={22} color={colors.accent} />
          <Text style={styles.actionText}>Get help</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: sharing }}
          disabled={sharing}
          onPress={onShare}
          style={({ pressed }) => [
            styles.actionButton,
            styles.shareButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="share" size={22} color={colors.accent} />
          <Text style={styles.actionText}>
            {sharing ? 'Preparing…' : 'Share receipt'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: homeTheme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconButton: {
    width: homeTheme.layout.touchTarget,
    height: homeTheme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  content: {
    width: '100%',
    maxWidth: homeTheme.layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingBottom: homeTheme.spacing.xl,
    gap: homeTheme.spacing.lg,
  },
  hero: { alignItems: 'center', gap: 4, marginTop: 8 },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#e3efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#ffffff', fontSize: 34, fontWeight: '600' },
  name: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  vpa: { color: homeTheme.colors.muted, fontSize: 15 },
  amount: {
    color: colors.ink,
    fontSize: 44,
    fontWeight: '800',
    marginTop: 10,
  },
  amountLabel: { color: homeTheme.colors.muted, fontSize: 13 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: homeTheme.colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: homeTheme.colors.positive,
    fontSize: 15,
    fontWeight: '600',
  },
  date: { color: homeTheme.colors.muted, fontSize: 13 },
  payAgain: {
    minHeight: 48,
    minWidth: 160,
    borderRadius: homeTheme.radius.pill,
    backgroundColor: homeTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: 12,
  },
  payAgainText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  breakdown: {
    borderRadius: homeTheme.radius.surface,
    backgroundColor: '#eaf3ff',
    padding: 18,
    gap: 10,
  },
  details: {
    borderRadius: homeTheme.radius.surface,
    borderWidth: 1,
    borderColor: homeTheme.colors.border,
    padding: 18,
    gap: 10,
  },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueWrap: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: { color: homeTheme.colors.muted, fontSize: 14 },
  value: { color: colors.ink, fontSize: 14, flexShrink: 1 },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  totalValue: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#c9dcf5' },
  note: { color: homeTheme.colors.muted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: homeTheme.radius.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  helpButton: { borderWidth: 1, borderColor: homeTheme.colors.primary },
  shareButton: { backgroundColor: '#e3efff' },
  actionText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  missingCopy: {
    color: homeTheme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
