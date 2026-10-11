import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import {
  addMoneyCurrency,
  addMoneyRate,
  addMoneyReceive,
} from '../src/features/payment/add-money-currency';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

export default function ReviewAddMoney() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const params = useLocalSearchParams<{
    amount?: string;
    method?: string;
    currency?: string;
  }>();
  const currency = addMoneyCurrency(
    Array.isArray(params.currency) ? params.currency[0] : params.currency,
  );
  const raw = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const amount = Number(raw);
  const valid = Number.isFinite(amount) && amount > 0;
  const receive = addMoneyReceive(amount, currency);
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
          <Text style={styles.usdc}>
            {currency === 'INR' ? 'Indian Rupees' : `≈ ${receive}`}
          </Text>
        </View>
        <View style={styles.rate}>
          <View style={styles.rateIcon}>
            <AppIcon name="send" color={tc(colors.accent)} />
          </View>
          <View style={styles.rateCopy}>
            <Text style={styles.label}>
              {currency === 'INR'
                ? 'Exchange rate'
                : 'Illustrative exchange rate'}
            </Text>
            <Text style={styles.rateValue}>{addMoneyRate(currency)}</Text>
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
            <Text style={styles.receive}>{receive}</Text>
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

const styles = themedStyleSheet({
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
