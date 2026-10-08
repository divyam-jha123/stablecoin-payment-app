import { useSyncExternalStore } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { formatPathUsdAtomic } from '../src/features/payment/amount';
import { simulatedPaymentStore } from '../src/features/payment/simulated-payment-store';
import {
  formatPaymentTime,
  paymentPathUsdAtomic,
} from '../src/features/payment/simulated-payments';

const GREEN = '#12a150';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

export default function Success() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const payments = useSyncExternalStore(
    simulatedPaymentStore.subscribe,
    simulatedPaymentStore.getSnapshot,
  );
  const payment = id ? payments.find((item) => item.id === id) : undefined;
  const inrAmount = payment
    ? Number(payment.inrAmount).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })
    : '';

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        {payment ? (
          <>
            <View style={[styles.icon, styles.iconSuccess]}>
              <AppIcon name="check" color="#ffffff" size={56} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              Payment successful
            </Text>
            <Text style={styles.amount}>₹{inrAmount}</Text>
            <Text style={styles.subtitle}>
              Paid to {payment.merchantName} · {payment.location}
            </Text>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Payment details</Text>
              <SummaryRow label="Reference ID" value={payment.reference} />
              <SummaryRow label="Amount paid" value={`₹${inrAmount}`} />
              <SummaryRow
                label="Debited"
                value={`${formatPathUsdAtomic(paymentPathUsdAtomic(payment))} ${payment.token}`}
              />
              <SummaryRow label="Settlement" value="Completed" />
              <SummaryRow
                label="Date & time"
                value={formatPaymentTime(payment.createdAt)}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.icon}>
              <AppIcon name="wallet" color={colors.accent} size={48} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              No payment completed
            </Text>
            <Text style={styles.subtitle}>
              No payment was found. No funds were moved and no merchant received
              INR.
            </Text>
          </>
        )}
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/home')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>View Wallet</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/scanner')}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Scan Another QR</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, alignItems: 'center', gap: 14 },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e7f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  iconSuccess: { backgroundColor: GREEN },
  amount: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 330,
  },
  summary: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#a8cbff',
    borderRadius: 16,
    padding: 17,
    marginTop: 20,
    gap: 14,
    backgroundColor: '#f5f9ff',
  },
  summaryTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#dae7fa',
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
  spacer: { flex: 1 },
  button: {
    backgroundColor: colors.accent,
    alignSelf: 'stretch',
    minHeight: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 21, fontWeight: '600' },
  secondary: {
    borderColor: colors.accent,
    borderWidth: 1,
    alignSelf: 'stretch',
    minHeight: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontSize: 18, fontWeight: '600' },
});
