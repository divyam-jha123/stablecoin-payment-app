import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { ILLUSTRATIVE_INR_PER_PATH_USD } from '../src/features/payment/amount';

const illustrativeRate = Number(ILLUSTRATIVE_INR_PER_PATH_USD);

export default function ReviewAddMoney() {
  const params = useLocalSearchParams<{ amount?: string; method?: string }>();
  const raw = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const amount = Number(raw);
  const valid = Number.isFinite(amount) && amount > 0;
  const estimate = valid ? (amount / illustrativeRate).toFixed(2) : '0.00';
  const method = Array.isArray(params.method)
    ? params.method[0]
    : params.method;
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.back}
          >
            <AppIcon name="back" />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Review Payment
          </Text>
          <View style={styles.spacerHead} />
        </View>
        <Text style={styles.preview}>
          Design preview · no payment will be submitted
        </Text>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>You're adding</Text>
          <Text style={styles.amount}>
            ₹{valid ? amount.toLocaleString('en-IN') : '0'}
          </Text>
          <Text style={styles.usdc}>≈ {estimate} pathUSD</Text>
        </View>
        <View style={styles.rate}>
          <View style={styles.rateIcon}>
            <AppIcon name="send" color={colors.accent} />
          </View>
          <View style={styles.rateCopy}>
            <Text style={styles.label}>Illustrative exchange rate</Text>
            <Text style={styles.rateValue}>
              1 pathUSD ≈ ₹{ILLUSTRATIVE_INR_PER_PATH_USD}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>
              ₹{valid ? amount.toLocaleString('en-IN') : '0'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Network fee</Text>
            <Text style={styles.value}>Not quoted</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Platform fee</Text>
            <Text style={styles.value}>Not quoted</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Estimated receive</Text>
            <Text style={styles.receive}>{estimate} pathUSD</Text>
          </View>
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Funding is not connected</Text>
          <Text style={styles.noticeCopy}>
            This is a visual preview of the Figma flow. No quote has been issued
            and no funds can be added by this method.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paying with</Text>
          <Text style={styles.method}>{method ?? 'No method selected'}</Text>
          <Text style={styles.label}>
            Unavailable in the current testnet app
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/home')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Wallet</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  back: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  spacerHead: { width: 48 },
  preview: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  hero: { backgroundColor: '#ecf6ff', borderRadius: 14, padding: 20, gap: 4 },
  heroLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  amount: { color: colors.ink, fontSize: 43, fontWeight: '700' },
  usdc: { color: colors.muted, fontSize: 22, fontWeight: '600' },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
  },
  rateIcon: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: '#e9f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateCopy: { gap: 3 },
  label: { color: colors.muted, fontSize: 13 },
  rateValue: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  card: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 18,
  },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.line },
  receive: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  notice: { backgroundColor: '#e8f2ff', borderRadius: 14, padding: 16, gap: 5 },
  noticeTitle: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  noticeCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  method: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
