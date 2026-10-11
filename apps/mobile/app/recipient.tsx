import { Fragment, useRef, useSyncExternalStore } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { vpaSchema } from '@traveller/shared';
import { AppIcon, colors } from '../src/components/payment-ui';
import { DashboardNav } from '../src/components/dashboard-nav';
import { homeTheme } from '../src/theme/home';
import { walletStore } from '../src/features/account/metamask';
import {
  profileAvatarColor,
  profileInitial,
} from '../src/features/account/profile-details';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import { recipientPayments } from '../src/features/payment/simulated-payments';
import { previewInr, previewReceiptPayments } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** "17 Sept" */
function dateLabel(createdAt: number) {
  return new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** "17 Sept, 12:54 pm" */
function stampLabel(createdAt: number) {
  const time = new Date(createdAt).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateLabel(createdAt)}, ${time}`;
}

/** Compact age such as "5m", "3h", "2d" or "154w". */
function ageLabel(createdAt: number, now: number) {
  const elapsed = Math.max(0, now - createdAt);
  if (elapsed < HOUR) return `${Math.max(1, Math.floor(elapsed / MINUTE))}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;
  return `${Math.floor(elapsed / WEEK)}w`;
}

/** Everything paid to one recipient, oldest first, like a chat thread. */
export default function Recipient() {
  // Redraw in the new colours when the theme switches.
  useScheme();
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
        uiPreviewEnabled ? [...previewReceiptPayments, ...stored] : stored,
        { name, vpa },
      )
    : [];
  const now = Date.now();

  // Like a chat, open on the newest payment at the bottom.
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  function pay() {
    if (vpa)
      router.push({
        pathname: '/confirmation',
        params: { merchantName: name, merchantVpa: vpa },
      });
    else router.push('/scanner');
  }

  function openMenu() {
    Alert.alert(name || 'Recipient', vpa ?? undefined, [
      ...(name ? [{ text: `Pay ${name}`, onPress: pay }] : []),
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
            router.canGoBack() ? router.back() : router.replace('/payments')
          }
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="chevron-left" size={28} />
        </Pressable>
        <View
          style={[
            styles.avatar,
            { backgroundColor: tc(profileAvatarColor(name || '?'), 'bg') },
          ]}
        >
          <Text style={styles.initial}>{profileInitial(name)}</Text>
        </View>
        <Text
          accessibilityRole="header"
          accessibilityHint={vpa ? `UPI ID ${vpa}` : undefined}
          numberOfLines={2}
          style={styles.name}
        >
          {name || 'Unknown recipient'}
        </Text>
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
            <Circle cx={5} cy={12} r={2} fill={tc(colors.ink, 'auto')} />
            <Circle cx={12} cy={12} r={2} fill={tc(colors.ink, 'auto')} />
            <Circle cx={19} cy={12} r={2} fill={tc(colors.ink, 'auto')} />
          </Svg>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (scrolled.current || !history.length) return;
          scrolled.current = true;
          scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        {history.length ? (
          history.map((payment) => {
            const amount = previewInr(Number(payment.inrAmount));
            return (
              <Fragment key={payment.id}>
                <View style={styles.stampRow}>
                  <View style={styles.stampLine} />
                  <Text style={styles.stamp}>
                    {stampLabel(payment.createdAt)}
                  </Text>
                  <View style={styles.stampLine} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Paid ${amount} to ${payment.merchantName} on ${stampLabel(payment.createdAt)}. View receipt.`}
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
                  <Text numberOfLines={2} style={styles.paidTo}>
                    Payment to {payment.merchantName}
                  </Text>
                  <Text style={styles.age}>
                    {ageLabel(payment.createdAt, now)}
                  </Text>
                  <Text
                    style={styles.amount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {amount}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={styles.checkBadge}>
                      <AppIcon name="check" size={12} color={tc('#ffffff')} />
                    </View>
                    <Text style={styles.status} numberOfLines={1}>
                      Paid • {dateLabel(payment.createdAt)}
                    </Text>
                    <View style={styles.chevron}>
                      <AppIcon
                        name="chevron-left"
                        size={16}
                        color={tc(homeTheme.colors.muted)}
                      />
                    </View>
                  </View>
                </Pressable>
              </Fragment>
            );
          })
        ) : (
          <View style={styles.empty}>
            <AppIcon name="activity" color={tc(colors.accent)} size={30} />
            <Text style={styles.emptyCopy}>
              No payments to this recipient on this device yet.
            </Text>
          </View>
        )}
        <Text style={styles.disclosure}>
          {uiPreviewEnabled
            ? 'Sample data for design preview only. No funds moved.'
            : 'INR settlement is simulated. Receipts show the Tempo testnet debit.'}
        </Text>
      </ScrollView>

      <View style={styles.navArea}>
        <DashboardNav current="/payments" floating />
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: homeTheme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: homeTheme.spacing.sm,
    paddingVertical: 8,
  },
  iconButton: {
    width: homeTheme.layout.touchTarget,
    height: homeTheme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#ffffff', fontSize: 24, fontWeight: '500' },
  name: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: homeTheme.layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingTop: homeTheme.spacing.sm,
    paddingBottom: homeTheme.spacing.xl,
    gap: homeTheme.spacing.xl,
  },
  stampRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stampLine: { flex: 1, height: 1, backgroundColor: homeTheme.colors.border },
  stamp: { color: colors.ink, fontSize: 14 },
  paymentCard: {
    alignSelf: 'flex-end',
    width: '60%',
    minWidth: 240,
    borderRadius: homeTheme.radius.surface,
    borderWidth: 1,
    borderColor: homeTheme.colors.border,
    backgroundColor: homeTheme.colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 2,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  paidTo: { color: colors.ink, fontSize: 17, lineHeight: 23 },
  age: { color: homeTheme.colors.muted, fontSize: 13 },
  amount: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 8,
    marginBottom: 6,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: homeTheme.colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { flex: 1, color: colors.ink, fontSize: 14 },
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
  navArea: {
    backgroundColor: homeTheme.colors.background,
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingBottom: homeTheme.spacing.sm,
  },
});
