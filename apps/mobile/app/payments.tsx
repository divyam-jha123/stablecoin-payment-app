import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardNav } from '../src/components/dashboard-nav';
import { Action, AppIcon, colors, ui } from '../src/components/payment-ui';

export default function Payments() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  if (mode === 'receive') return <Redirect href="/receive" />;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={ui.title}>
          Payments
        </Text>
        <View style={styles.card}>
          <AppIcon name="send" color={colors.accent} size={36} />
          <Text style={ui.heading}>Pay a merchant</Text>
          <Text style={ui.body}>
            Scan a UPI QR to review the merchant, amount, and estimated test
            funds needed.
          </Text>
          <Action title="Scan & Pay" onPress={() => router.push('/scanner')} />
        </View>
        <View style={styles.card}>
          <AppIcon name="receive" color={colors.accent} size={36} />
          <Text style={ui.heading}>Receive a demo payment</Text>
          <Text style={ui.body}>
            Show your TravelPe QR and request an optional INR amount.
          </Text>
          <Action
            secondary
            title="Show receive QR"
            onPress={() => router.push('/receive')}
          />
        </View>
        <View style={styles.card}>
          <Text style={ui.heading}>Send to contacts</Text>
          <Text style={ui.body}>Contact transfers are not available yet.</Text>
          <Action
            secondary
            title="View payment activity"
            onPress={() => router.replace('/activity')}
          />
        </View>
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
});
