import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, AppIcon, colors, ui } from './payment-ui';
import {
  connectStatusText,
  useWalletSignIn,
} from '../features/account/use-wallet-sign-in';

/**
 * Shown on wallet-only screens (scan, receive) when the traveller signed in
 * with Google and has not connected a wallet yet.
 */
export function ConnectWalletGate({ message }: { message: string }) {
  // Connect right here; once the wallet is in, the screen behind this swaps in.
  const { signIn, busy, stage, error } = useWalletSignIn({
    onDone: () => {},
  });
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <AppIcon name="wallet" color={colors.accent} size={44} />
        <Text accessibilityRole="header" style={ui.title}>
          Connect your wallet
        </Text>
        <Text style={[ui.body, styles.center]}>{message}</Text>
        {busy ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[ui.body, styles.center]}
          >
            {connectStatusText(stage)}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={[ui.body, styles.center]}>
            {error}
          </Text>
        ) : null}
        <Action
          title={busy ? 'Waiting for MetaMask…' : 'Connect to Wallet'}
          disabled={busy}
          onPress={() => void signIn()}
        />
        <Action secondary title="Back" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  center: { textAlign: 'center' },
});
