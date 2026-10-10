import { Fragment, useRef, useSyncExternalStore } from 'react';
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
import { vpaSchema } from '@traveller/shared';
import { AppIcon, colors } from '../src/components/payment-ui';
import { homeTheme } from '../src/theme/home';
import { walletStore } from '../src/features/account/metamask';
import {
  profileAvatarColor,
  profileInitial,
} from '../src/features/account/profile-details';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  recipientPayments,
  type SimulatedPayment,
} from '../src/features/payment/simulated-payments';
import { previewInr, previewRecipientPayments } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function dayLabel(createdAt: number) {
  return new Date(createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function timeLabel(createdAt: number) {
  return new Date(createdAt).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Everything paid to one recipient, oldest first, with Pay. */
export default function Recipient() {
  const params = useLocalSearchParams<{
    name?: string | string[];
    vpa?: string | string[];
  }>();
  // Names and UPI IDs come from QR codes, so check them again here.
  const rawName = firstParam(params.name)?.trim() ?? '';
  const name = rawName.length <= 120 ? rawName : '';
  const vpaResult = vpaSchema.safeParse(firstParam(params.vpa)?.trim());
  const vpa = vpaResult.success ? vpaResult.data : null;

  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const stored = useSimulatedPayments(
    uiPreviewEnabled ? null : wallet.account?.address,
  );
  const history = name
    ? recipientPayments(
        uiPreviewEnabled ? [...previewRecipientPayments, ...stored] : stored,
        { name, vpa },
      )
    : [];
  const total = history.reduce(
    (sum, payment) => sum + Number(payment.inrAmount),
    0,
  );

  // Like a chat, open on the newest payment at the bottom.
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const days: { label: string; payments: SimulatedPayment[] }[] = [];
  for (const payment of history) {
    const label = dayLabel(payment.createdAt);
    const last = days[days.length - 1];
    if (last?.label === label) last.payments.push(payment);
    else days.push({ label, payments: [payment] });
  }

  function payAgain() {
    if (vpa)
      router.push({
        pathname: '/confirmation',
        params: { merchantName: name, merchantVpa: vpa },
      });
    else router.push('/scanner');
  }

  function openMenu() {
    Alert.alert(name || 'Recipient', undefined, [
      ...(vpa
        ? [
            {
              text: 'Copy UPI ID',
              onPress: () => void Clipboard.setStringAsync(vpa),
            },
          ]
        : []),
      { text: 'All activity', onPress: () => router.push('/activity') },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/home')
          }
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="back" size={24} />
        </Pressable>
        <View
          style={[
            styles.avatar,
            { backgroundColor: profileAvatarColor(name || '?') },
          ]}
        >
          <Text style={styles.initial}>{profileInitial(name)}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.name}
          >
            {name || 'Unknown recipient'}
          </Text>
          {vpa ? (
            <Text numberOfLines={1} style={styles.vpa}>
              {vpa}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          hitSlop={8}
          onPress={openMenu}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Circle cx={12} cy={5} r={2} fill={colors.ink} />
            <Circle cx={12} cy={12} r={2} fill={colors.ink} />
            <Circle cx={12} cy={19} r={2} fill={colors.ink} />
          </Svg>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (scrolled.current || !history.length) return;
          scrolled.current = true;
          scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total paid</Text>
          <Text style={styles.totalValue}>{previewInr(total)}</Text>
          <Text style={styles.totalCount}>
            {history.length === 1
              ? '1 successful payment'
              : `${history.length} successful payments`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Payment history</Text>
        {days.length ? (
          days.map((day) => (
            <Fragment key={day.label}>
              <View style={styles.dayRow}>
                <View style={styles.dayLine} />
                <Text style={styles.dayLabel}>{day.label}</Text>
                <View style={styles.dayLine} />
              </View>
              {day.payments.map((payment) => (
                <Pressable
                  key={payment.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Paid ${previewInr(Number(payment.inrAmount))} to ${payment.merchantName}, completed at ${timeLabel(payment.createdAt)}. View receipt.`}
                  onPress={() =>
                    router.push({
                      pathname: '/receipt',
                      params: { id: payment.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.paymentCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.paidTo}>
                    Paid to {payment.merchantName}
                  </Text>
                  <Text style={styles.amount}>
                    {previewInr(Number(payment.inrAmount))}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={styles.checkBadge}>
                      <AppIcon name="check" size={13} color="#ffffff" />
                    </View>
                    <Text style={styles.status}>Completed</Text>
                    <Text style={styles.time}>
                      {timeLabel(payment.createdAt)}
                    </Text>
                    <View style={styles.chevron}>
                      <AppIcon
                        name="chevron-left"
                        size={16}
                        color={colors.ink}
                      />
                    </View>
                  </View>
                </Pressable>
              ))}
            </Fragment>
          ))
        ) : (
          <View style={styles.empty}>
            <AppIcon name="activity" color={colors.accent} size={30} />
            <Text style={styles.emptyCopy}>
              No payments to this recipient on this device yet.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.disclosure}>
          {uiPreviewEnabled
            ? 'Sample data for design preview only. No funds moved.'
            : 'INR settlement is simulated. Receipts show the Tempo testnet debit.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={
            vpa
              ? `Enter an amount to pay ${vpa}`
              : 'Opens the scanner to scan their QR'
          }
          disabled={!name}
          onPress={payAgain}
          style={({ pressed }) => [
            styles.payAgain,
            !name && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.payAgainLabel}>Pay</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: homeTheme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingVertical: 8,
  },
  iconButton: {
    width: homeTheme.layout.touchTarget,
    height: homeTheme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: homeTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#ffffff', fontSize: 22, fontWeight: '600' },
  headerCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  vpa: { color: homeTheme.colors.muted, fontSize: 14, marginTop: 1 },
  content: {
    width: '100%',
    maxWidth: homeTheme.layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingBottom: homeTheme.spacing.xl,
    gap: homeTheme.spacing.lg,
  },
  totalCard: {
    borderRadius: homeTheme.radius.surface,
    backgroundColor: '#eaf3ff',
    padding: 20,
    gap: 4,
  },
  totalLabel: { color: homeTheme.colors.muted, fontSize: 15 },
  totalValue: { color: colors.ink, fontSize: 34, fontWeight: '700' },
  totalCount: { color: homeTheme.colors.muted, fontSize: 13 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLine: { flex: 1, height: 1, backgroundColor: homeTheme.colors.border },
  dayLabel: { color: homeTheme.colors.muted, fontSize: 13 },
  paymentCard: {
    alignSelf: 'flex-end',
    width: '58%',
    minWidth: 220,
    borderRadius: homeTheme.radius.surface,
    backgroundColor: '#eef5ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    shadowColor: '#081332',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  paidTo: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  amount: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: homeTheme.colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { flex: 1, color: homeTheme.colors.muted, fontSize: 13 },
  time: { color: homeTheme.colors.muted, fontSize: 12 },
  chevron: { transform: [{ rotate: '180deg' }] },
  empty: {
    borderRadius: homeTheme.radius.surface,
    backgroundColor: '#f4f8ff',
    alignItems: 'center',
    padding: 20,
    gap: 6,
  },
  emptyCopy: {
    color: homeTheme.colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  disclosure: {
    color: homeTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: homeTheme.colors.border,
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  payAgain: {
    minHeight: 54,
    borderRadius: homeTheme.radius.pill,
    backgroundColor: homeTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payAgainLabel: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
