import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { AppIcon, colors } from '../src/components/payment-ui';
import {
  IndiaFlagEmblem,
  StarbucksLogo,
  UsdcTokenEmblem,
} from '../src/components/payment-logos';
import { walletStore } from '../src/features/account/metamask';
import { simulatedPaymentStore } from '../src/features/payment/simulated-payment-store';
import { uiPreviewEnabled } from '../src/ui-preview';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';

// Metro bundles these static Figma illustrations at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const skyline = require('../assets/figma/processing-skyline.png');
// The token illustration split into two aligned layers so the coin can move
// on its own and land back on the platform exactly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const coin = require('../assets/figma/processing-coin.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const platform = require('../assets/figma/processing-platform.png');

const BLUE = '#2f6bff';
const GREEN = '#12a150';
const RING_SIZE = 108;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Simulated payment: each step runs for this long before the next starts.
const STEP_DURATION_MS = 1600;
const STEPS: {
  label: string;
  icon: 'swap' | 'bank' | 'check';
  title: string;
  copy: (symbol: string) => string;
}[] = [
  {
    label: 'Convert',
    icon: 'swap',
    title: 'Processing payment',
    copy: (symbol) => `Converting INR to ${symbol} and preparing settlement`,
  },
  {
    label: 'Settle',
    icon: 'bank',
    title: 'Settling payment',
    copy: () => 'Sending INR to the merchant account',
  },
  {
    label: 'Confirm',
    icon: 'check',
    title: 'Confirming payment',
    copy: () => 'Waiting for the merchant to confirm receipt',
  },
];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function CoinDrop() {
  const drop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let idle: Animated.CompositeAnimation | undefined;
    const landing = Animated.sequence([
      Animated.delay(150),
      // Spring overshoots past the platform and settles, like a bounce.
      Animated.spring(drop, {
        toValue: 1,
        friction: 5,
        tension: 55,
        useNativeDriver: true,
      }),
    ]);
    const impact = Animated.sequence([
      Animated.delay(520),
      Animated.timing(pulse, {
        toValue: 1.07,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pulse, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]);

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        drop.setValue(1);
        return;
      }
      Animated.parallel([landing, impact]).start(({ finished }) => {
        if (!finished || cancelled) return;
        idle = Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(float, {
                toValue: 1,
                duration: 1100,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(float, {
                toValue: 0,
                duration: 1100,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
          ),
          Animated.loop(
            Animated.sequence([
              Animated.delay(1600),
              Animated.timing(spin, {
                toValue: 1,
                duration: 1000,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(spin, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ),
        ]);
        idle.start();
      });
    });

    return () => {
      cancelled = true;
      landing.stop();
      impact.stop();
      idle?.stop();
    };
  }, [drop, pulse, float, spin]);

  const coinTransform = [
    { perspective: 800 },
    {
      translateY: Animated.add(
        drop.interpolate({ inputRange: [0, 1], outputRange: [-260, 0] }),
        float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }),
      ),
    },
    {
      rotateY: spin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    },
  ];
  const coinOpacity = drop.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.token}
    >
      <Animated.Image
        source={platform}
        resizeMode="contain"
        style={[StyleSheet.absoluteFill, { transform: [{ scale: pulse }] }]}
      />
      <Animated.Image
        source={coin}
        resizeMode="contain"
        style={[
          StyleSheet.absoluteFill,
          { opacity: coinOpacity, transform: coinTransform },
        ]}
      />
    </View>
  );
}

function ProgressRing({ symbol }: { symbol: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      accessibilityLabel={`Converting to ${symbol}`}
      style={styles.ringWrap}
    >
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="#e4ecf8"
          strokeWidth={RING_STROKE}
          fill="#ffffff"
        />
      </Svg>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={BLUE}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_LENGTH * 0.28} ${RING_LENGTH}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
      <UsdcTokenEmblem size={54} />
    </View>
  );
}

export default function Processing() {
  const params = useLocalSearchParams<{
    merchantName?: string | string[];
    location?: string | string[];
    inrAmount?: string | string[];
    token?: string | string[];
  }>();
  const merchantName = firstParam(params.merchantName)?.trim() || 'Starbucks';
  const location = firstParam(params.location)?.trim() || 'Pune, Maharashtra';
  const inrAmount = firstParam(params.inrAmount)?.trim() || '500';
  const symbol = firstParam(params.token)?.trim() || 'USDC';
  const [stepIndex, setStepIndex] = useState(0);
  const recorded = useRef(false);

  const complete = useCallback(() => {
    if (recorded.current) return;
    recorded.current = true;
    // Demo only: no funds move on-chain. The app records the payment so the
    // wallet balance and activity reflect it.
    const payment = simulatedPaymentStore.record({
      address: uiPreviewEnabled
        ? null
        : walletStore.getSnapshot().account?.address,
      merchantName,
      location,
      inrAmount,
      token: symbol,
    });
    router.replace({ pathname: '/success', params: { id: payment.id } });
  }, [merchantName, location, inrAmount, symbol]);

  useEffect(() => {
    // The UI preview holds each step until it is advanced by hand.
    if (uiPreviewEnabled) return;
    if (stepIndex >= STEPS.length) {
      complete();
      return;
    }
    const timer = setTimeout(
      () => setStepIndex((index) => index + 1),
      STEP_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [stepIndex, complete]);

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)]!;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={skyline}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              uiPreviewEnabled && styles.previewSpace,
            ]}
            bounces={false}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <AppIcon name="chevron-left" size={22} />
            </Pressable>

            <View style={styles.header}>
              {merchantName.toLowerCase().includes('starbucks') ? (
                <StarbucksLogo size={64} />
              ) : (
                <View style={styles.merchantMark}>
                  <Text style={styles.merchantInitial}>
                    {merchantName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={styles.merchantName}
              >
                {merchantName}
              </Text>
              <Text numberOfLines={1} style={styles.location}>
                {location}
              </Text>
              <Text style={styles.amount}>₹{inrAmount}</Text>

              <View style={styles.pair}>
                <IndiaFlagEmblem size={42} />
                <Text style={styles.pairText}>INR</Text>
                <AppIcon name="arrow" size={22} color="#7d8aa3" />
                <UsdcTokenEmblem size={42} />
                <Text style={styles.pairText}>{symbol}</Text>
              </View>
              <Text style={styles.converting}>Converting to {symbol}</Text>
            </View>

            <CoinDrop />

            <View style={styles.card}>
              <ProgressRing symbol={symbol} />
              <Text accessibilityLiveRegion="polite" style={styles.cardTitle}>
                {currentStep.title}
              </Text>
              <Text style={styles.cardCopy}>{currentStep.copy(symbol)}</Text>

              <View style={styles.steps}>
                {STEPS.map((step, index) => {
                  const done = index < stepIndex;
                  const active = index === stepIndex;
                  const statusText = done
                    ? 'Done'
                    : active
                      ? 'In progress'
                      : 'Pending';
                  return (
                    <Fragment key={step.label}>
                      {index > 0 ? (
                        <View style={styles.connector}>
                          {[0, 1, 2, 3].map((dot) => (
                            <View
                              key={dot}
                              style={[
                                styles.connectorDot,
                                index <= stepIndex && styles.connectorDotDone,
                              ]}
                            />
                          ))}
                        </View>
                      ) : null}
                      <View
                        accessibilityLabel={`${step.label}, ${statusText.toLowerCase()}`}
                        style={[
                          styles.step,
                          active && styles.stepActive,
                          done && styles.stepDone,
                        ]}
                      >
                        <View
                          style={[
                            styles.stepIcon,
                            active && styles.stepIconActive,
                            done && styles.stepIconDone,
                          ]}
                        >
                          <AppIcon
                            name={done ? 'check' : step.icon}
                            size={20}
                            color={active || done ? '#ffffff' : '#3d4a63'}
                          />
                        </View>
                        <Text style={styles.stepLabel}>{step.label}</Text>
                        <View style={styles.stepStatusRow}>
                          <View
                            style={[
                              styles.statusDot,
                              active && styles.statusDotActive,
                              done && styles.statusDotDone,
                            ]}
                          />
                          <Text
                            style={[
                              styles.stepStatus,
                              active && styles.stepStatusActive,
                              done && styles.stepStatusDone,
                            ]}
                          >
                            {statusText}
                          </Text>
                        </View>
                      </View>
                    </Fragment>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
      <PreviewFlowBar
        status={
          stepIndex < STEPS.length
            ? `${STEPS[stepIndex]!.label} step ${stepIndex + 1} of ${STEPS.length}`
            : 'All steps done'
        }
        actions={[
          {
            label: '‹ Step',
            disabled: stepIndex === 0,
            onPress: () => setStepIndex((index) => Math.max(0, index - 1)),
          },
          {
            label: 'Step ›',
            disabled: stepIndex >= STEPS.length,
            onPress: () =>
              setStepIndex((index) => Math.min(STEPS.length, index + 1)),
          },
          { label: 'Success ›', onPress: complete },
          { label: 'Failed ›', onPress: () => router.replace('/failed') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e8f3ff' },
  background: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  previewSpace: { paddingBottom: 120 },
  back: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  header: { alignItems: 'center', marginTop: -8 },
  merchantMark: {
    alignItems: 'center',
    backgroundColor: '#e0efff',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  merchantInitial: { color: colors.accent, fontSize: 28, fontWeight: '700' },
  merchantName: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 12,
  },
  location: { color: colors.muted, fontSize: 18, marginTop: 2 },
  amount: {
    color: '#000000',
    fontSize: 54,
    fontWeight: '800',
    marginTop: 20,
    fontVariant: ['tabular-nums'],
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#c6dcff',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  pairText: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  converting: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '500',
    marginTop: 14,
  },
  token: {
    alignSelf: 'center',
    width: 250,
    height: 232,
    marginTop: 8,
  },
  card: {
    marginTop: 'auto',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 22,
    alignItems: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 14,
  },
  cardCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  steps: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
  },
  connector: {
    flexDirection: 'row',
    gap: 2,
    marginHorizontal: 3,
  },
  connectorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#b9c4d6',
  },
  connectorDotDone: { borderColor: GREEN, backgroundColor: GREEN },
  step: {
    flex: 1,
    maxWidth: 104,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#aab5c6',
    backgroundColor: '#f6f8fb',
  },
  stepActive: { borderColor: BLUE, backgroundColor: '#ffffff' },
  stepDone: { borderColor: GREEN, backgroundColor: '#ffffff' },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3e7ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconActive: { backgroundColor: BLUE },
  stepIconDone: { backgroundColor: GREEN },
  stepLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  stepStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7d8aa3',
  },
  statusDotActive: { backgroundColor: BLUE },
  statusDotDone: { backgroundColor: GREEN },
  stepStatus: { color: colors.muted, fontSize: 11 },
  stepStatusActive: { color: BLUE, fontWeight: '600' },
  stepStatusDone: { color: GREEN, fontWeight: '600' },
});
