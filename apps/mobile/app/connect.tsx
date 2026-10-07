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
import { useQueryClient } from '@tanstack/react-query';
import { ui } from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import { authenticateWallet } from '../src/features/account/session';
import { TEMPO_CHAIN } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { uiPreviewEnabled } from '../src/ui-preview';

export default function Connect() {
  const { wallet, onTempo, session } = useAccount();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const busy = signing || wallet.busy;
  const checking = Boolean(wallet.account && onTempo && session.isFetching);

  async function signIn() {
    if (uiPreviewEnabled) {
      router.replace('/home');
      return;
    }
    if (lock.current || walletStore.getSnapshot().busy) return;
    lock.current = true;
    setSigning(true);
    setError(null);
    try {
      if (!walletStore.getSnapshot().account) await walletStore.connect();
      else if (walletStore.getSnapshot().account?.chainId !== TEMPO_CHAIN.id)
        await walletStore.switchToTempo();
      const current = walletStore.getSnapshot();
      if (!current.account || current.account.chainId !== TEMPO_CHAIN.id) {
        throw new Error(
          current.error ?? 'Connect MetaMask on Tempo testnet to continue.',
        );
      }
      const account = current.account;
      // Cancel a pending restore so it cannot overwrite this sign-in result.
      await queryClient.cancelQueries({ queryKey: ['session'] });
      await authenticateWallet(account, walletStore.signMessage);
      await walletStore.refresh();
      const after = walletStore.getSnapshot().account;
      if (
        after?.address.toLowerCase() !== account.address.toLowerCase() ||
        after.chainId !== account.chainId
      ) {
        throw new Error(
          'Your wallet changed during sign-in. Please try again.',
        );
      }
      queryClient.setQueryData(
        ['session', account.address, account.chainId],
        true,
      );
    } catch (cause) {
      setError(walletError(cause));
    } finally {
      setSigning(false);
      lock.current = false;
    }
  }

  if (
    !uiPreviewEnabled &&
    wallet.account &&
    onTempo &&
    session.data === true &&
    !busy
  )
    return <Redirect href="/home" />;

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
                {busy
                  ? 'Approve the request in MetaMask, then return here.'
                  : 'Checking your sign-in…'}
              </Text>
            </View>
          ) : null}
          {error || wallet.error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error ?? wallet.error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!uiPreviewEnabled && (busy || checking)}
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.mainButton,
              pressed && ui.pressed,
              (busy || checking) && styles.disabled,
            ]}
          >
            <Text style={styles.mainButtonText}>
              {uiPreviewEnabled
                ? 'Continue to dashboard'
                : busy
                  ? 'Waiting for MetaMask…'
                  : checking
                    ? 'Checking sign-in…'
                    : !wallet.account
                      ? 'Continue with MetaMask'
                      : !onTempo
                        ? 'Switch network & sign in'
                        : 'Sign in with MetaMask'}
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
