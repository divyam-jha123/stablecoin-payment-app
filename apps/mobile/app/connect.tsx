import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Redirect, router, Stack } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ui } from '../src/components/payment-ui';
import {
  connectStatusText,
  useWalletSignIn,
} from '../src/features/account/use-wallet-sign-in';
import { useAccount } from '../src/features/account/use-account';
import { googleAccount } from '../src/features/account/google-account';
import {
  GoogleSignInError,
  signInWithGoogle,
} from '../src/features/account/google-sign-in';
import { pinStore } from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';
import { uiPreviewEnabled } from '../src/ui-preview';

// Sample Google identity for the UI preview only; wallet mode uses the real one.
const PREVIEW_GOOGLE_PROFILE = {
  sub: 'preview',
  name: 'Rupesh Kumar',
  email: 'rupesh@gmail.com',
};

// Background grid from the reference design: square cells about a sixth of
// the screen wide, offset so no line sits on the screen edge.
const GRID_CELL = 1 / 6.4;
const GRID_OFFSET = 0.55;
// The hero lines are 1.13x their font size; three lines share the hero area.
const HERO_MAX_FONT = 78;
const HERO_LINE_RATIO = 1.13;
const HERO_PADDING = 12;

function GridBackdrop() {
  const { width, height } = useWindowDimensions();
  const cell = width * GRID_CELL;
  const offset = cell * GRID_OFFSET;
  const columns = Array.from(
    { length: Math.ceil((width - offset) / cell) },
    (_, index) => offset + index * cell,
  );
  const rows = Array.from(
    { length: Math.ceil((height - offset) / cell) },
    (_, index) => offset + index * cell,
  );

  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <RadialGradient
          id="connect-glow"
          cx={width * 0.82}
          cy={height * 0.08}
          r={width * 0.9}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#0d2f8a" stopOpacity={0.95} />
          <Stop offset="0.45" stopColor="#0a2266" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#connect-glow)" />
      {columns.map((x) => (
        <Line
          key={`c${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#ffffff"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}
      {rows.map((y) => (
        <Line
          key={`r${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#ffffff"
          strokeOpacity={0.1}
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
}

export default function Connect() {
  const insets = useSafeAreaInsets();
  // The hero fills whatever the sheet leaves, so the screen never scrolls;
  // its text shrinks to fit shorter screens.
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  const heroFont =
    heroHeight === null
      ? null
      : Math.min(
          HERO_MAX_FONT,
          (heroHeight - 2 * HERO_PADDING) / (3 * HERO_LINE_RATIO),
        );
  const { wallet, onTempo, session } = useAccount();
  const [localError, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const { signIn, busy, stage, error: walletSignInError } = useWalletSignIn();
  const error = localError ?? walletSignInError;
  const [googleBusy, setGoogleBusy] = useState(false);
  const checking = Boolean(wallet.account && onTempo && session.isFetching);
  const signedIn = Boolean(
    !uiPreviewEnabled && wallet.account && onTempo && session.data === true,
  );
  // Explore without a wallet: Google proves who you are, MetaMask is only
  // needed later, from Home, to see balances and pay.
  async function signUpWithGoogle() {
    if (lock.current || googleBusy || busy) return;
    lock.current = true;
    setGoogleBusy(true);
    setError(null);
    try {
      const profile = uiPreviewEnabled
        ? PREVIEW_GOOGLE_PROFILE
        : await signInWithGoogle();
      if (!profile) return;
      await googleAccount.save(profile);
      // Google signup comes first; PIN creation completes setup.
      const hasPin = await pinStore.hasPin(pinOwner());
      router.replace(hasPin ? '/home' : '/pin-setup');
    } catch (cause) {
      setError(
        cause instanceof GoogleSignInError
          ? cause.message
          : 'Could not sign in with Google. Try again.',
      );
    } finally {
      setGoogleBusy(false);
      lock.current = false;
    }
  }

  // A signed-in wallet still sets its payment PIN before reaching Home.
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void pinStore
      .hasPin(pinOwner())
      .catch(() => false)
      .then((saved) => {
        if (live) setHasPin(saved);
      });
    return () => {
      live = false;
    };
  }, [signedIn]);

  if (signedIn && !busy && !googleBusy && hasPin !== null)
    return <Redirect href={hasPin ? '/home' : '/pin-setup'} />;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <GridBackdrop />
      <SafeAreaView edges={['top']} style={styles.content}>
        <Text style={styles.wordmark}>
          Travel<Text style={styles.blue}>Pe</Text>
        </Text>
        <View
          style={styles.hero}
          onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}
        >
          {heroFont !== null ? (
            <Text
              accessibilityRole="header"
              style={[
                styles.heroText,
                {
                  fontSize: heroFont,
                  lineHeight: heroFont * HERO_LINE_RATIO,
                },
              ]}
            >
              One{'\n'}
              <Text style={styles.blue}>Last</Text>
              {'\n'}Step.
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Login App</Text>
          <Text style={styles.subtitle}>
            {uiPreviewEnabled
              ? 'Explore the app screens in preview mode.'
              : 'Connect your wallet to scan and pay across India.'}
          </Text>
          {wallet.account && (
            <Text selectable style={styles.connected}>
              Connected wallet: {wallet.account.address}
            </Text>
          )}
          {busy || checking ? (
            <View style={styles.status}>
              <ActivityIndicator color="#fff" />
              <Text accessibilityLiveRegion="polite" style={styles.statusText}>
                {busy ? connectStatusText(stage) : 'Checking your sign-in…'}
              </Text>
            </View>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!uiPreviewEnabled && (busy || checking || googleBusy)}
            onPress={() => {
              setError(null);
              void signIn();
            }}
            style={({ pressed }) => [
              styles.mainButton,
              pressed && ui.pressed,
              (busy || checking) && styles.disabled,
            ]}
          >
            <Text style={styles.mainButtonText}>
              {uiPreviewEnabled
                ? 'Continue'
                : busy
                  ? stage === 'connecting' ||
                    stage === 'combined' ||
                    stage === 'signing' ||
                    stage === 'network'
                    ? 'Waiting for MetaMask…'
                    : 'Signing you in…'
                  : checking
                    ? 'Checking sign-in…'
                    : !wallet.account
                      ? 'Continue with MetaMask'
                      : !onTempo
                        ? 'Switch network & sign in'
                        : 'Sign in with MetaMask'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign up with Google"
            accessibilityState={{ disabled: busy || checking || googleBusy }}
            disabled={busy || checking || googleBusy}
            onPress={() => void signUpWithGoogle()}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && ui.pressed,
              (busy || checking || googleBusy) && styles.disabled,
            ]}
          >
            {googleBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.googleMark}>G</Text>
            )}
            <Text style={styles.googleText}>
              {googleBusy ? 'Opening Google…' : 'Sign up with Google'}
            </Text>
          </Pressable>
          {!uiPreviewEnabled && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                void Linking.openURL('https://metamask.io/download/').catch(
                  () =>
                    setError('Could not open the download page. Try again.'),
                );
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Get MetaMask</Text>
            </Pressable>
          )}
          <Text style={styles.legal}>
            Your keys stay in MetaMask. Tempo testnet funds have no monetary
            value; INR settlement is simulated.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000', flex: 1 },
  content: { flex: 1 },
  wordmark: {
    color: '#fff',
    fontSize: 17,
    marginHorizontal: 24,
    marginTop: 16,
  },
  blue: { color: '#0088ff' },
  hero: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: HERO_PADDING,
    overflow: 'hidden',
  },
  heroText: { color: '#fff', fontWeight: '700', includeFontPadding: false },
  sheet: {
    backgroundColor: '#00317b',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 32,
    paddingTop: 14,
    gap: 14,
  },
  handle: {
    width: 60,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#87a7d3',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: { color: '#fff', fontSize: 30, fontWeight: '500' },
  subtitle: {
    color: '#c1d7f5',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  connected: { color: '#d4e6ff', fontSize: 12 },
  status: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  statusText: { color: '#fff', flex: 1, fontSize: 13 },
  error: { color: '#ffcbc7', fontSize: 14 },
  mainButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: { color: '#061a42', fontSize: 16, fontWeight: '700' },
  googleButton: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#97b7e6',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMark: { color: '#fff', fontSize: 18, fontWeight: '800' },
  googleText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#97b7e6',
    borderRadius: 26,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  legal: {
    color: '#c6dbfa',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
});
