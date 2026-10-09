import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './payment-ui';
import { homeTheme as theme } from '../theme/home';

/**
 * Stands in for the balance and quick actions on Home when the traveller
 * signed in with Google and has not connected a wallet yet.
 */
export function HomeConnectWalletCard({
  onConnect,
  busy = false,
  status,
  error,
}: {
  onConnect: () => void;
  busy?: boolean;
  status?: string;
  error?: string | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <AppIcon name="wallet" size={26} color={theme.colors.onBalance} />
      </View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          Connect your wallet
        </Text>
        <Text style={styles.body}>
          See your balance, add money, scan to pay and receive once MetaMask is
          connected.
        </Text>
      </View>
      {busy && status ? (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {status}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connect to Wallet"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onConnect}
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>
          {busy ? 'Waiting for MetaMask…' : 'Connect to Wallet'}
        </Text>
        <AppIcon name="arrow" size={18} color={theme.colors.balanceBottom} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.surface,
    backgroundColor: theme.colors.balanceBottom,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.balanceTop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: theme.spacing.xs },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.onBalance },
  body: { ...theme.typography.body, color: theme.colors.balanceMuted },
  button: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.onBalance,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.balanceBottom,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.onBalance,
    fontWeight: '700',
  },
  pressed: { opacity: 0.8 },
});
