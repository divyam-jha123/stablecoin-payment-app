import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardNav } from '../src/components/dashboard-nav';
import { Action, AppIcon, colors, ui } from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { uiPreviewEnabled } from '../src/ui-preview';

export default function Payments() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { wallet } = useAccount();
  const receive = mode === 'receive';
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={ui.title}>
          {receive ? 'Receive' : 'Payments'}
        </Text>
        <View style={styles.card}>
          <AppIcon
            name={receive ? 'receive' : 'send'}
            color={colors.accent}
            size={36}
          />
          <Text style={ui.heading}>
            {receive ? 'Your wallet address' : 'Pay a merchant'}
          </Text>
          <Text style={ui.body}>
            {receive
              ? 'Only use Tempo Moderato test funds with this wallet.'
              : 'Scan a UPI QR to review the merchant, amount, and estimated test funds needed.'}
          </Text>
          {receive ? (
            <Text selectable style={styles.address}>
              {uiPreviewEnabled
                ? 'Connect a wallet to see your address.'
                : (wallet.account?.address ?? 'No wallet connected.')}
            </Text>
          ) : (
            <Action
              title="Scan & Pay"
              onPress={() => router.push('/scanner')}
            />
          )}
        </View>
        {!receive && (
          <View style={styles.card}>
            <Text style={ui.heading}>Send to contacts</Text>
            <Text style={ui.body}>
              Contact transfers are not available yet.
            </Text>
            <Action
              secondary
              title="View payment activity"
              onPress={() => router.replace('/activity')}
            />
          </View>
        )}
        {receive && !wallet.account && !uiPreviewEnabled && (
          <Action
            title="Connect wallet"
            onPress={() => router.push('/connect')}
          />
        )}
        <Text style={ui.caption}>
          Payment submission and INR settlement are not enabled yet.
        </Text>
      </ScrollView>
      <DashboardNav />
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
  card: { backgroundColor: '#f4f8ff', borderRadius: 16, padding: 20, gap: 16 },
  address: { color: colors.ink, fontSize: 15, lineHeight: 23 },
});
