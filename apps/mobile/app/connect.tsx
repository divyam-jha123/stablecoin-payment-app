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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ui } from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import {
  pinStore,
  PREVIEW_PIN_OWNER,
} from '../src/features/account/payment-pin';
import { rememberedAccount } from '../src/features/account/remembered-account';
import {
  authenticateWallet,
  requestSignInChallenge,
  verifySignInChallenge,
} from '../src/features/account/session';
import { TEMPO_CHAIN } from '../src/features/account/tempo';
import {
  walletError,
  type ConnectStage,
} from '../src/features/account/wallet-store';
import { walletFlowLog } from '../src/features/account/wallet-flow-log';
import { uiPreviewEnabled } from '../src/ui-preview';
import { returnFromWallet } from '../src/features/account/wallet-return';

const stageText: Record<ConnectStage, string> = {
  preparing: 'Preparing MetaMask connection…',
  connecting: 'Approve the connection in MetaMask, then return here.',
  combined: 'Approve connection and sign-in in MetaMask, then return here.',
  network: 'Approve Tempo testnet in MetaMask, then return here.',
  'checking-session': 'Checking your existing sign-in…',
  challenge: 'Preparing your secure sign-in…',
  signing: 'Confirm your sign-in in MetaMask, then return here.',
  verifying: 'Verifying your wallet signature…',
  saving: 'Saving your sign-in…',
};

function canRetryCombined(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error))
    return false;
  return (
    error.code === 4100 ||
    error.code === 4902 ||
    error.code === -32601 ||
    error.code === -32602
  );
}

export default function Connect() {
  const { wallet, onTempo, session } = useAccount();
  const queryClient = useQueryClient();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<ConnectStage | null>(null);
  const lock = useRef(false);
  const busy = signing || wallet.busy;
  const checking = Boolean(wallet.account && onTempo && session.isFetching);
  const signedIn = Boolean(
    !uiPreviewEnabled && wallet.account && onTempo && session.data === true,
  );
  // After sign-in: set the TravelPe payment PIN, then Home.
  const nextStep = useQuery({
    queryKey: ['after-sign-in', wallet.account?.address],
    queryFn: async () =>
      (await pinStore.hasPin(wallet.account!.address))
        ? ('/home' as const)
        : ('/pin-setup' as const),
    enabled: signedIn,
    retry: false,
  });

  async function signIn() {
    if (uiPreviewEnabled) {
      setSigning(true);
      try {
        const hasPin = await pinStore.hasPin(PREVIEW_PIN_OWNER);
        router.replace(hasPin ? '/' : '/pin-setup');
      } catch {
        setError('Could not load your PIN. Try again.');
      } finally {
        setSigning(false);
      }
      return;
    }
    if (lock.current || walletStore.getSnapshot().busy) return;
    walletFlowLog.begin();
    lock.current = true;
    setSigning(true);
    setError(null);
    setStage('preparing');
    try {
      let combined:
        | {
            account: { address: string; chainId: number };
            signature: `0x${string}`;
            challenge: Awaited<ReturnType<typeof requestSignInChallenge>>;
          }
        | undefined;
      const remembered = await rememberedAccount.load();
      const liveAccount = remembered
        ? await walletStore.liveAccount()
        : walletStore.getSnapshot().account;
      if (remembered && !liveAccount && walletStore.connectAndSign) {
        const challenge = await requestSignInChallenge(remembered, setStage);
        try {
          const signed = await walletStore.connectAndSign(
            challenge.message,
            setStage,
          );
          if (signed.account.address.toLowerCase() !== remembered.toLowerCase())
            throw new Error(
              'MetaMask selected a different account. Sign in with the wallet you used before.',
            );
          combined = { ...signed, challenge };
          await walletStore.refresh();
        } catch (cause) {
          if (!canRetryCombined(cause)) throw cause;
          walletFlowLog.info(
            'Combined sign-in unavailable; using wallet approval steps',
          );
        }
      }
      if (!combined && !liveAccount) {
        walletFlowLog.info('Starting MetaMask connection');
        await walletStore.connect(setStage);
      } else if (!combined && liveAccount?.chainId !== TEMPO_CHAIN.id) {
        walletFlowLog.info('Wallet connected; requesting Tempo network');
        await walletStore.switchToTempo(setStage);
      } else if (!combined) {
        walletFlowLog.info('Wallet already connected on Tempo');
        await walletStore.refresh();
      }
      if (combined && combined.account.chainId !== TEMPO_CHAIN.id)
        await walletStore.switchToTempo(setStage);
      const current = walletStore.getSnapshot();
      if (!current.account || current.account.chainId !== TEMPO_CHAIN.id) {
        throw new Error(
          current.error ?? 'Connect MetaMask on Tempo testnet to continue.',
        );
      }
      walletFlowLog.info('Wallet account confirmed on Tempo testnet');
      const account = current.account;
      if (
        combined &&
        account.address.toLowerCase() !== combined.account.address.toLowerCase()
      )
        throw new Error(
          'Your wallet changed during sign-in. Please try again.',
        );
      // Cancel a pending restore so it cannot overwrite this sign-in result.
      walletFlowLog.info('Cancelling any pending session check');
      await queryClient.cancelQueries({ queryKey: ['session'] });
      walletFlowLog.info('Starting backend wallet sign-in');
      if (combined)
        await verifySignInChallenge(
          account,
          combined.challenge,
          combined.signature,
          setStage,
        );
      else await authenticateWallet(account, walletStore.signMessage, setStage);
      walletFlowLog.info('Backend wallet sign-in completed');
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
      walletFlowLog.info('Wallet still matches signed-in account');
      // Next launch opens straight to Home, behind the app lock.
      await rememberedAccount.remember(account.address);
      queryClient.setQueryData(
        ['session', account.address, account.chainId],
        true,
      );
      const hasPin = await pinStore.hasPin(account.address);
      walletFlowLog.info('Session marked ready; opening next screen');
      router.replace(hasPin ? '/home' : '/pin-setup');
      void returnFromWallet();
    } catch (cause) {
      walletFlowLog.error('Sign-in stopped', cause);
      walletFlowLog.stop();
      setError(walletError(cause));
      void returnFromWallet();
    } finally {
      setSigning(false);
      setStage(null);
      lock.current = false;
    }
  }

  if (signedIn && !busy && nextStep.isFetched)
    return <Redirect href={nextStep.data ?? '/home'} />;

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
                  ? stage
                    ? stageText[stage]
                    : 'Connecting to MetaMask…'
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
