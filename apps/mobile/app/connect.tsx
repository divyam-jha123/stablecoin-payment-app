import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function Connect() {
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

  if (signedIn && !busy && !googleBusy) return <Redirect href="/home" />;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.wordmark}>
          Travel<Text style={styles.blue}>Pe</Text>
        </Text>
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.heroText}>
            One{'\n'}
            <Text style={styles.blue}>Last</Text>
            {'\n'}Step.
          </Text>
        </View>
        <View style={styles.sheet}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000', flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  wordmark: {
    color: '#fff',
    fontSize: 17,
    marginHorizontal: 24,
    marginTop: 16,
  },
  blue: { color: '#0088ff' },
  hero: { minHeight: 340, justifyContent: 'center', paddingHorizontal: 24 },
  heroText: { color: '#fff', fontSize: 78, fontWeight: '700', lineHeight: 88 },
  sheet: {
    backgroundColor: '#00317b',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 32,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 16,
    minHeight: 365,
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
    marginBottom: 14,
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
    marginTop: 12,
  },
  disabled: { opacity: 0.6 },
});
