import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';

export default function Success() {
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <AppIcon name="wallet" color={colors.accent} size={48} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          No payment completed
        </Text>
        <Text style={styles.subtitle}>
          Payment submission is not available yet. No funds were moved and no
          merchant received INR.
        </Text>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Payment status</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Transaction ID</Text>
            <Text style={styles.value}>Not created</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount paid</Text>
            <Text style={styles.value}>—</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Settlement</Text>
            <Text style={styles.value}>Not started</Text>
          </View>
        </View>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/home')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>View Wallet</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/scanner')}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Scan Another QR</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, alignItems: 'center', gap: 14 },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e7f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 330,
  },
  summary: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#a8cbff',
    borderRadius: 16,
    padding: 17,
    marginTop: 20,
    gap: 14,
    backgroundColor: '#f5f9ff',
  },
  summaryTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#dae7fa',
    paddingTop: 12,
  },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  spacer: { flex: 1 },
  button: {
    backgroundColor: colors.accent,
    alignSelf: 'stretch',
    minHeight: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 21, fontWeight: '600' },
  secondary: {
    borderColor: colors.accent,
    borderWidth: 1,
    alignSelf: 'stretch',
    minHeight: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontSize: 18, fontWeight: '600' },
});
