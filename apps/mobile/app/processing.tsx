import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  ImageBackground,
  Pressable,
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
  TokenEmblem,
} from '../src/components/payment-logos';
import { walletStore } from '../src/features/account/metamask';
import { simulatedPaymentStore } from '../src/features/payment/simulated-payment-store';
import { uiPreviewEnabled } from '../src/ui-preview';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';

// Metro bundles these static Figma illustrations at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const skyline = require('../assets/figma/processing-skyline.png');
// The token illustration in aligned layers: the base platform, the light
// streaks around the coin (still), and the ₹ coin alone, which moves.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const coinRays = require('../assets/figma/processing-coin-rays.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const coinDisc = require('../assets/figma/processing-coin-disc.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const platform = require('../assets/figma/processing-platform.png');

const BLUE = '#2f6bff';
const GREEN = '#12a150';
const RING_SIZE = 84;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Simulated payment timeline, in seconds. Each step runs until its end, then
// the next starts; after the last the payment completes.
//   Convert  0.0–1.1  ₹ coin rises out of the base coin into a hover
//   Settle   1.1–1.5  coin hovers
//   Confirm  1.5–1.8  base rings green
//   Done     1.8–2.2  ₹ coin moves up and fades out, then success opens
const STEP_ENDS = [1.1, 1.5, 1.8, 2.2];
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

// Artwork geometry, in source-image pixels (both layers are 1303 x 1207).
const ART_WIDTH = 1303;
const ART_HEIGHT = 1207;
// Largest the illustration is drawn; shorter screens get a smaller one.
const MAX_ART_HEIGHT = 232;
const STAGE_GAP = 12;
const USDC_CENTER = { x: 650, y: 860 };
// Top face of the platform coin, which carries the USDC logo in the artwork.
const PLATFORM_FACE = { width: 545, height: 190 };
// The base coin's face: the ₹ coin is hidden below this line until it rises
// out of the base.
const EMERGE_LINE_Y = 860;
// Green confirmation glow for each step (Convert, Settle, Confirm, Done).
const CONFIRM_LEVELS = [0, 0, 1, 1];
// Outer glass ring of the base, and the coin's lower edge.
const BASE_RING = { x: 650, y: 960, width: 780, height: 290 };
const COIN_BOTTOM_Y = 655;
// Top edge of the ₹ coin in the artwork. The coin starts this far down,
// hidden inside the base face, and rises out of it.
const COIN_TOP_Y = 204;
const EMERGE_MS = 1000;
const EXIT_MS = 380;
const HOVER_MS = 1700;

/**
 * The conversion illustration: the token base and the light streaks around
 * the coin stay perfectly still; only the gold ₹ coin moves. It rises out of
 * the base coin into a hover, and once the steps are done it moves up and
 * fades out. The base rim glows, turning green on Confirm. Reduced motion
 * shows the still artwork.
 */
function CoinScene({
  scale,
  symbol,
  stage,
}: {
  scale: number;
  symbol: string;
  stage: number;
}) {
  const intro = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;
  const confirm = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const exited = useRef(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    const confirmLevel =
      CONFIRM_LEVELS[Math.min(stage, CONFIRM_LEVELS.length - 1)]!;
    const done = stage >= STEPS.length;
    const coinMoves: Animated.CompositeAnimation[] = [];
    if (done && !exited.current) {
      // Payment steps done: the coin moves up and fades out.
      exited.current = true;
      if (reduceMotion.current) exit.setValue(1);
      else
        coinMoves.push(
          Animated.timing(exit, {
            toValue: 1,
            duration: EXIT_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        );
    } else if (!done && exited.current) {
      // The preview stepped back: bring the coin up out of the base again.
      exited.current = false;
      exit.setValue(0);
      if (reduceMotion.current) rise.setValue(1);
      else {
        rise.setValue(0);
        coinMoves.push(
          Animated.timing(rise, {
            toValue: 1,
            duration: EMERGE_MS,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        );
      }
    }
    const animation = Animated.parallel([
      Animated.timing(confirm, {
        toValue: confirmLevel,
        duration: 450,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      ...coinMoves,
    ]);
    animation.start();
    return () => animation.stop();
  }, [stage, confirm, exit, rise]);

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      reduceMotion.current = reduce;
      if (reduce) {
        intro.setValue(1);
        rise.setValue(1);
        return;
      }
      animation = Animated.parallel([
        // The streaks fade in, then the coin rises out of the base face with
        // a slight overshoot into its hover spot.
        Animated.timing(intro, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 1,
          delay: 300,
          duration: EMERGE_MS,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(hover, {
              toValue: 1,
              duration: HOVER_MS,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(hover, {
              toValue: 0,
              duration: HOVER_MS,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ),
      ]);
      animation.start();
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [intro, rise, hover]);

  const width = ART_WIDTH * scale;
  const height = ART_HEIGHT * scale;
  const centerX = USDC_CENTER.x * scale;
  // Coin: rises out of the base face, hovers by a small distance, and at the
  // end shoots up past the top of the illustration.
  const coinY = Animated.add(
    Animated.add(
      rise.interpolate({
        inputRange: [0, 1],
        outputRange: [(EMERGE_LINE_Y - COIN_TOP_Y) * scale, 0],
      }),
      hover.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -0.022 * height],
      }),
    ),
    exit.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(COIN_BOTTOM_Y * scale + 0.1 * height)],
    }),
  );
  const coinOpacity = Animated.multiply(
    rise.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] }),
    // Gone before it reaches the top edge of the illustration area.
    exit.interpolate({
      inputRange: [0, 0.25, 0.55],
      outputRange: [1, 0.75, 0],
      extrapolate: 'clamp',
    }),
  );
  // Light pulses follow the hover: brightest when the coin is lowest.
  const pulse = hover.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
    >
      {/* Rim glow behind the base, so the base itself never moves. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.baseGlow,
          {
            left: (BASE_RING.x - BASE_RING.width / 2) * scale,
            top: (BASE_RING.y - BASE_RING.height / 2) * scale,
            width: BASE_RING.width * scale,
            height: BASE_RING.height * scale,
            borderRadius: (BASE_RING.width * scale) / 2,
            opacity: Animated.multiply(
              Animated.multiply(
                intro,
                pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 0.85],
                }),
              ),
              confirm.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.3],
              }),
            ),
          },
        ]}
      />
      {/* Confirm: the rim turns green with one ring pulsing outwards. */}
      {[false, true].map((ring) => (
        <Animated.View
          key={ring ? 'ring' : 'rim'}
          pointerEvents="none"
          style={[
            styles.confirmGlow,
            {
              left: (BASE_RING.x - BASE_RING.width / 2) * scale,
              top: (BASE_RING.y - BASE_RING.height / 2) * scale,
              width: BASE_RING.width * scale,
              height: BASE_RING.height * scale,
              borderRadius: (BASE_RING.width * scale) / 2,
              opacity: ring
                ? confirm.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0, 0.8, 0],
                  })
                : Animated.multiply(confirm, 0.8),
              transform: ring
                ? [
                    {
                      scale: confirm.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1.45],
                      }),
                    },
                  ]
                : [],
            },
          ]}
        />
      ))}

      <Image
        source={platform}
        resizeMode="contain"
        style={[styles.layer, { width, height }]}
      />

      {symbol !== 'USDC' ? (
        // The platform art shows the USDC logo; cover its face with the
        // payment token, flattened to the same perspective.
        <View
          pointerEvents="none"
          style={[
            styles.layer,
            {
              left: centerX - (PLATFORM_FACE.width * scale) / 2,
              top: USDC_CENTER.y * scale - (PLATFORM_FACE.width * scale) / 2,
              width: PLATFORM_FACE.width * scale,
              height: PLATFORM_FACE.width * scale,
              transform: [
                { scaleY: PLATFORM_FACE.height / PLATFORM_FACE.width },
              ],
            },
          ]}
        >
          <TokenEmblem symbol={symbol} size={PLATFORM_FACE.width * scale} />
        </View>
      ) : null}

      {/* Light streaks around the coin: part of the artwork, never moving. */}
      <Animated.Image
        source={coinRays}
        resizeMode="contain"
        style={[styles.layer, { width, height, opacity: intro }]}
      />

      {/* Clipped at the base face, so the coin comes up out of the base;
          open above, so it can shoot up and away at the end. */}
      <View
        pointerEvents="none"
        style={[
          styles.layer,
          {
            top: -height,
            width,
            height: EMERGE_LINE_Y * scale + height,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Soft blue glow under the coin's lower edge. */}
        <Animated.View
          style={[
            styles.coinUnderGlow,
            {
              left: centerX - 0.17 * height,
              top: height + COIN_BOTTOM_Y * scale - 0.035 * height,
              width: 0.34 * height,
              height: 0.07 * height,
              borderRadius: 0.17 * height,
              opacity: Animated.multiply(
                coinOpacity,
                pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.75],
                }),
              ),
              transform: [{ translateY: coinY }],
            },
          ]}
        />

        <Animated.Image
          source={coinDisc}
          resizeMode="contain"
          style={[
            styles.layer,
            { top: height, width, height },
            { opacity: coinOpacity, transform: [{ translateY: coinY }] },
          ]}
        />
      </View>
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
      <TokenEmblem symbol={symbol} size={42} />
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

  // Each step plays its part of the coin story, then the next step starts.
  // The UI preview holds each step until it is advanced by hand; stepping
  // back replays that part.
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = Math.min(stepIndex, STEP_ENDS.length - 1);
    const start = step === 0 ? 0 : STEP_ENDS[step - 1]!;
    const end = STEP_ENDS[step]!;
    const next = () => {
      if (cancelled || uiPreviewEnabled) return;
      if (stepIndex >= STEPS.length) complete();
      else setStepIndex((index) => index + 1);
    };

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        progress.setValue(end);
        timer = setTimeout(next, 700);
        return;
      }
      progress.setValue(start);
      animation = Animated.timing(progress, {
        toValue: end,
        duration: (end - start) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (finished) next();
      });
    });
    return () => {
      cancelled = true;
      animation?.stop();
      clearTimeout(timer);
    };
  }, [stepIndex, complete, progress]);

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)]!;
  // Draw the coin artwork at the height left between the header and the
  // card, so it never runs under either of them.
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const artScale =
    stageHeight === null
      ? null
      : Math.max(0, Math.min(MAX_ART_HEIGHT, stageHeight - STAGE_GAP * 2)) /
        ART_HEIGHT;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={skyline}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {/* One fixed screen: the coin stage takes whatever height is left. */}
          <View style={styles.content}>
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
                <StarbucksLogo size={56} />
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
              <Text style={styles.amount}>
                ₹
                {Number(inrAmount).toLocaleString('en-IN', {
                  maximumFractionDigits: 2,
                })}
              </Text>

              <View style={styles.pair}>
                <IndiaFlagEmblem size={30} />
                <Text style={styles.pairText}>INR</Text>
                <AppIcon name="arrow" size={20} color="#7d8aa3" />
                <TokenEmblem symbol={symbol} size={30} />
                <Text style={styles.pairText}>{symbol}</Text>
              </View>
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.converting, stepIndex > 0 && styles.ready]}
              >
                {stepIndex > 0 ? `${symbol} ready` : `Converting to ${symbol}`}
              </Text>
            </View>

            <View
              style={styles.stage}
              onLayout={({ nativeEvent }) =>
                setStageHeight(nativeEvent.layout.height)
              }
            >
              {artScale ? (
                <CoinScene scale={artScale} symbol={symbol} stage={stepIndex} />
              ) : null}
            </View>

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
                            size={18}
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
          </View>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: {
    position: 'absolute',
    top: 8,
    left: 20,
    zIndex: 1,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  header: { alignItems: 'center', paddingTop: 4 },
  merchantMark: {
    alignItems: 'center',
    backgroundColor: '#e0efff',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  merchantInitial: { color: colors.accent, fontSize: 24, fontWeight: '700' },
  merchantName: {
    color: '#000000',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 8,
  },
  location: { color: colors.muted, fontSize: 13, marginTop: 1 },
  amount: {
    color: '#000000',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#c6dcff',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  pairText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  converting: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  ready: { color: BLUE, fontWeight: '700' },
  // Clipped so the falling coin and its glow never cover the header or card.
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: 4,
  },
  // Each artwork layer covers the illustration box exactly.
  layer: { position: 'absolute', left: 0, top: 0 },
  baseGlow: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(64,150,255,0.55)',
    shadowColor: '#2f8bff',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  confirmGlow: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(46,170,90,0.75)',
    shadowColor: '#22a35a',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  coinUnderGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(90,160,255,0.35)',
    shadowColor: '#3d8bff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 14,
    paddingVertical: 16,
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },
  cardCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  steps: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
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
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#aab5c6',
    backgroundColor: '#f6f8fb',
  },
  stepActive: { borderColor: BLUE, backgroundColor: '#ffffff' },
  stepDone: { borderColor: GREEN, backgroundColor: '#ffffff' },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    marginTop: 4,
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
