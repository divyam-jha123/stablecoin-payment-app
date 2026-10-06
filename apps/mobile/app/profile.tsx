import { useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { logoutSession } from '../src/features/account/session';
import { uiPreviewEnabled } from '../src/ui-preview';

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
