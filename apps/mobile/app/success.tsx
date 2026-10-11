import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';
import { useReceiptShare } from '../src/components/share-receipt-card';
import { previewSamplePayment } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';
import { formatPathUsdAtomic } from '../src/features/payment/amount';
import { simulatedPaymentStore } from '../src/features/payment/simulated-payment-store';
import { formatInr, SIMULATED_NOTICE } from '../src/features/payment/receipt';
import {
  formatPaymentTime,
  paymentPathUsdAtomic,
} from '../src/features/payment/simulated-payments';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const GREEN = '#00974f';
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
// Success animation timeline in ms, after assets/paymentConfirmation.mp4 at
// twice its speed: a shine crosses the badge with a small pulse, the tick
// draws, the halo grows in, the strokes burst outwards, then the text and
// card fade up.
const REVEAL_MS = 900;
const SHINE = [160, 320] as const;
const PULSE = [240, 300, 360] as const;
const TICK = [340, 480] as const;
const HALO_IN = [400, 520] as const;
const BURST_OUT = [520, 680] as const;
const TEXT_IN = [700, 850] as const;
const CARD_IN = [760, REVEAL_MS] as const;
// The check icon's path in a 24-unit box, and its length for the draw.
const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
const CHECK_LENGTH = 20;
const AnimatedPath = Animated.createAnimatedComponent(Path);
// Played as the tick starts to draw.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const successTune = require('../assets/sounds/payment-success.m4a');
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

const at = (ms: number) => ms / REVEAL_MS;

/**
 * Plays the success reveal once, with the tune as the tick starts; reduced
 * motion shows the final state and plays the tune straight away.
 */
function useSuccessReveal(withTune: boolean) {
  const tune = useAudioPlayer(successTune);
  const progress = useRef(new Animated.Value(0)).current;
  // The tick's dash offset can't run on the native driver, so it gets its
  // own value.
  const tick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    let tuneTimer: ReturnType<typeof setTimeout> | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (withTune) {
        tuneTimer = setTimeout(() => tune.play(), reduce ? 0 : TICK[0]);
      }
      if (reduce) {
        progress.setValue(1);
        tick.setValue(1);
        return;
      }
      animation = Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: REVEAL_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(tick, {
          toValue: 1,
          delay: TICK[0],
          duration: TICK[1] - TICK[0],
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]);
      animation.start();
    });
    return () => {
      cancelled = true;
      animation?.stop();
      clearTimeout(tuneTimer);
    };
  }, [progress, tick, tune, withTune]);

  return { progress, tick };
}

/**
 * Interpolation over part of the reveal, following `ease`. The native driver
 * rejects an `easing` option on interpolate, so the curve is sampled into
 * keyframes instead.
 */
function eased(
  [start, end]: readonly number[],
  [from, to]: readonly [number, number],
  ease: (t: number) => number,
) {
  const steps = 10;
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    inputRange.push(at(start! + (end! - start!) * t));
    outputRange.push(from + (to - from) * ease(t));
  }
  return { inputRange, outputRange, extrapolate: 'clamp' as const };
}

/** Fades and lifts content in over the given part of the reveal. */
function fadeUp(progress: Animated.Value, [start, end]: readonly number[]) {
  const range = {
    inputRange: [at(start!), at(end!)],
    extrapolate: 'clamp' as const,
  };
  return {
    opacity: progress.interpolate({ ...range, outputRange: [0, 1] }),
    transform: [
      {
        translateY: progress.interpolate(
          eased([start!, end!], [10, 0], Easing.out(Easing.cubic)),
        ),
      },
    ],
  } as const;
}

function SuccessBadge({
  progress,
  tick,
}: {
  progress: Animated.Value;
  tick: Animated.Value;
}) {
  const clamp = 'clamp' as const;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.badgeArea}
    >
      {BURST.map(([angle, opacity]) => {
        const radians = (angle * Math.PI) / 180;
        const radius = progress.interpolate(
          eased(
            BURST_OUT,
            [HALO / 2 - 8, BURST_RADIUS],
            Easing.out(Easing.cubic),
          ),
        );
        return (
          <Animated.View
            key={angle}
            style={[
              styles.burst,
              {
                opacity: progress.interpolate({
                  inputRange: [at(BURST_OUT[0]), at(BURST_OUT[1])],
                  outputRange: [0, opacity],
                  extrapolate: clamp,
                }),
                transform: [
                  { translateX: Animated.multiply(radius, Math.cos(radians)) },
                  { translateY: Animated.multiply(radius, Math.sin(radians)) },
                  { rotate: `${angle}deg` },
                ],
              },
            ]}
          />
        );
      })}
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: progress.interpolate({
              inputRange: [at(HALO_IN[0]), at(HALO_IN[1])],
              outputRange: [0, 1],
              extrapolate: clamp,
            }),
            transform: [
              {
                scale: progress.interpolate(
                  eased(HALO_IN, [0.82, 1], Easing.out(Easing.cubic)),
                ),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badge,
          {
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: PULSE.map(at),
                  outputRange: [1, 1.04, 1],
                  extrapolate: clamp,
                }),
              },
            ],
          },
        ]}
      >
        {/* Light sweeping across the badge. */}
        <Animated.View
          style={[
            styles.shine,
            {
              opacity: progress.interpolate({
                inputRange: [at(SHINE[0]), at(SHINE[0]) + 0.01, at(SHINE[1])],
                outputRange: [0, 1, 1],
                extrapolate: clamp,
              }),
              transform: [
                {
                  translateX: progress.interpolate(
                    eased(
                      SHINE,
                      [-BADGE * 0.75, BADGE * 0.75],
                      Easing.inOut(Easing.quad),
                    ),
                  ),
                },
                { rotate: '20deg' },
              ],
            },
          ]}
        />
        <Svg width={72} height={72} viewBox="0 0 24 24">
          <AnimatedPath
            d={CHECK_PATH}
            stroke={tc('#ffffff')}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LENGTH}
            strokeDashoffset={tick.interpolate({
              inputRange: [0, 1],
              outputRange: [CHECK_LENGTH, 0],
            })}
            opacity={tick.interpolate({
              inputRange: [0, 0.01, 1],
              outputRange: [0, 1, 1],
            })}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export default function Success() {
  // Redraw in the new colours when the theme switches.
  useScheme();
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
  const receiptShare = useReceiptShare(payment);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { progress, tick } = useSuccessReveal(payment !== undefined);

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
          <AppIcon name="help" size={22} color={tc(colors.ink)} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {payment ? (
          <>
            <SuccessBadge progress={progress} tick={tick} />
            <Animated.View style={[styles.copy, fadeUp(progress, TEXT_IN)]}>
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
            </Animated.View>

            <Animated.View
              style={[styles.merchantCard, fadeUp(progress, CARD_IN)]}
            >
              <View style={styles.merchantIcon}>
                <AppIcon name="store" size={26} color={tc(colors.accent)} />
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
                  color={tc(colors.accent)}
                />
              </Pressable>
            </Animated.View>

            {detailsOpen ? (
              <View style={styles.summary}>
                <SummaryRow label="Reference ID" value={payment.reference} />
                <SummaryRow
                  label="Debited"
                  value={`${formatPathUsdAtomic(paymentPathUsdAtomic(payment))} ${payment.token}`}
                />
                {payment.txHash ? (
                  <SummaryRow
                    label="Tempo transaction"
                    value={shortHash(payment.txHash)}
                  />
                ) : null}
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
              <AppIcon name="wallet" color={tc(colors.accent)} size={48} />
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
            <AppIcon name="arrow" size={24} color={tc('#ffffff')} />
          </View>
        </Pressable>
        {payment ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: receiptShare.busy }}
            disabled={receiptShare.busy}
            onPress={() => void receiptShare.share()}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon name="share" size={20} color={tc(colors.accent)} />
            <Text style={styles.secondaryText}>
              {receiptShare.busy ? 'Preparing…' : 'Share receipt'}
            </Text>
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
      {receiptShare.card}
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
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
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    backgroundColor: '#e9f5ef',
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    width: 26,
    height: BADGE * 1.4,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  copy: { alignSelf: 'stretch', alignItems: 'center' },
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
