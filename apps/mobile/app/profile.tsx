import { useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardNav } from '../src/components/dashboard-nav';
import {
  Action,
  AppIcon,
  colors,
  TestNotice,
  ui,
} from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import {
  paymentKeyStore,
  revokeKeyCall,
} from '../src/features/account/payment-key';
import { phoneHasLock } from '../src/features/account/device-lock';
import { pinStore } from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';
import { rememberedAccount } from '../src/features/account/remembered-account';
import { logoutSession } from '../src/features/account/session';
import { publicClient } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { formatPathUsdAtomic } from '../src/features/payment/amount';
import { previewTapToPay } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

function shortDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** App lock and payment confirmation, both using the phone's own lock. */
function SecurityCard() {
  const lock = useQuery({
    queryKey: ['phone-lock'],
    queryFn: phoneHasLock,
    retry: false,
  });
  const owner = pinOwner();
  const pin = useQuery({
    queryKey: ['payment-pin', owner],
    queryFn: () => pinStore.hasPin(owner!),
    enabled: Boolean(owner),
    retry: false,
  });
  return (
    <View style={styles.card}>
      <Text style={ui.heading}>Security</Text>
      <Text style={ui.caption}>
        {lock.isPending
          ? 'Checking…'
          : lock.data
            ? 'App lock is on. When you come back to TravelPe, unlock it with your fingerprint, face or phone PIN.'
            : 'Set a screen lock on your phone to protect TravelPe. Until then the app is not locked.'}
      </Text>
      <Text style={ui.caption}>
        {pin.data
          ? 'Payments are approved with your 4-digit TravelPe PIN.'
          : 'Set a 4-digit TravelPe PIN to approve payments.'}
      </Text>
      {owner && pin.isFetched ? (
        <Action
          secondary
          title={pin.data ? 'Change PIN' : 'Set PIN'}
          onPress={() =>
            router.push(
              pin.data
                ? {
                    pathname: '/pin-entry',
                    params: { mode: 'change', next: 'profile' },
                  }
                : { pathname: '/pin-setup', params: { next: 'profile' } },
            )
          }
        />
      ) : null}
    </View>
  );
}

/** Tap-to-pay state from the chain, with turn on / turn off. */
function TapToPayCard({ owner }: { owner: string | undefined }) {
  const queryClient = useQueryClient();
  const [turningOff, setTurningOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useQuery({
    queryKey: ['payment-key', owner],
    queryFn: () => paymentKeyStore.status(owner!),
    enabled: Boolean(!uiPreviewEnabled && owner),
    retry: false,
  });

  async function turnOff() {
    const current = status.data;
    if (!owner || !current || current.state === 'none') return;
    setTurningOff(true);
    setError(null);
    try {
      if (current.state === 'active') {
        const hash = await walletStore.sendTransaction(
          revokeKeyCall(current.key),
        );
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 90_000,
        });
        if (receipt.status !== 'success') {
          throw new Error(
            'Tempo rejected the request. Tap to pay is still on.',
          );
        }
      }
      await paymentKeyStore.remove(owner);
      await queryClient.invalidateQueries({ queryKey: ['payment-key'] });
    } catch (cause) {
      setError(walletError(cause));
    } finally {
      setTurningOff(false);
    }
  }

  const confirmTurnOff = () =>
    Alert.alert(
      'Turn off tap to pay?',
      'Approve once in MetaMask. After that, each payment opens MetaMask.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => void turnOff(),
        },
      ],
    );

  let summary: string;
  let detail: string | null = null;
  let action: {
    title: string;
    onPress: () => void;
    secondary?: boolean;
  } | null = null;
  const data = status.data;
  if (uiPreviewEnabled) {
    summary = `On · $${previewTapToPay.dailyLimitUsd} a day until ${shortDate(previewTapToPay.expiry)}`;
    detail = `$${previewTapToPay.remainingUsd} left today`;
    action = {
      title: 'Turn off tap to pay',
      onPress: confirmTurnOff,
      secondary: true,
    };
  } else if (!owner) {
    summary = 'Connect MetaMask to use tap to pay.';
  } else if (status.isPending) {
    summary = 'Checking…';
  } else if (status.isError || !data) {
    summary = "Couldn't check tap to pay. Try again shortly.";
  } else if (data.state === 'active') {
    summary = `On · $${data.key.dailyLimitUsd} a day until ${shortDate(data.key.expiry)}`;
    detail = `$${formatPathUsdAtomic(data.remainingAtomic)} left today`;
    action = {
      title: turningOff ? 'Turning off…' : 'Turn off tap to pay',
      onPress: confirmTurnOff,
      secondary: true,
    };
  } else if (data.state === 'none') {
    summary = 'Off. Each payment opens MetaMask.';
    action = {
      title: 'Turn on tap to pay',
      onPress: () => router.push('/setup-payments'),
    };
  } else {
    summary =
      data.state === 'expired'
        ? `Ended on ${shortDate(data.key.expiry)}. Each payment opens MetaMask.`
        : 'Turned off. Each payment opens MetaMask.';
    action = {
      title: 'Turn on again',
      onPress: () => router.push('/setup-payments'),
    };
  }

  return (
    <View style={styles.card}>
      <Text style={ui.heading}>Tap to pay</Text>
      <Text style={ui.caption}>{summary}</Text>
      {detail ? <Text style={ui.caption}>{detail}</Text> : null}
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {action ? (
        <Action
          title={action.title}
          secondary={action.secondary ?? false}
          disabled={turningOff}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}

export default function Profile() {
  const { wallet, onTempo } = useAccount();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const lock = useRef(false);
  async function disconnect() {
    if (uiPreviewEnabled || lock.current || walletStore.getSnapshot().busy)
      return;
    lock.current = true;
    setLeaving(true);
    try {
      await rememberedAccount.forget();
      // A forgotten PIN is reset by signing in again.
      const address = walletStore.getSnapshot().account?.address;
      if (address) await pinStore.clear(address);
      await logoutSession();
    } catch {
      /* The local session is cleared even if revocation is unavailable. */
    } finally {
      await walletStore.disconnect();
      await queryClient.cancelQueries({ queryKey: ['session'] });
      queryClient.removeQueries({ queryKey: ['session'] });
      queryClient.removeQueries({ queryKey: ['tempo-pathUSD'] });
      router.replace('/connect');
      lock.current = false;
      setLeaving(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={ui.title}>
          Profile
        </Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <AppIcon name="person" color={colors.accent} size={34} />
          </View>
          <Text style={ui.heading}>Traveller</Text>
          <Text style={ui.caption}>
            {uiPreviewEnabled
              ? 'UI preview'
              : wallet.account
                ? 'MetaMask wallet'
                : 'Wallet not connected'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={ui.heading}>Wallet details</Text>
          <Text selectable style={ui.caption}>
            {uiPreviewEnabled
              ? 'No wallet is connected in preview mode.'
              : (wallet.account?.address ??
                'Connect MetaMask to view your wallet.')}
          </Text>
          {!uiPreviewEnabled && wallet.account && (
            <Text style={ui.caption}>
              {onTempo
                ? 'Tempo Moderato testnet'
                : 'Switch to Tempo Moderato to use the app.'}
            </Text>
          )}
        </View>
        <TapToPayCard owner={wallet.account?.address} />
        <SecurityCard />
        {!uiPreviewEnabled && (
          <Action
            secondary={Boolean(wallet.account)}
            title={
              leaving
                ? 'Disconnecting…'
                : wallet.account
                  ? 'Disconnect wallet'
                  : 'Connect wallet'
            }
            disabled={leaving || wallet.busy}
            onPress={() =>
              wallet.account ? void disconnect() : router.push('/connect')
            }
          />
        )}
        <TestNotice />
      </ScrollView>
      <DashboardNav disabled={leaving} />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: {
    padding: 24,
    gap: 24,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  identity: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3efff',
  },
  card: { backgroundColor: '#f4f8ff', borderRadius: 16, padding: 20, gap: 12 },
});
