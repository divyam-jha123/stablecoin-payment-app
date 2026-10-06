import { useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { ILLUSTRATIVE_INR_PER_PATH_USD } from '../src/features/payment/amount';

const presets = [1000, 2000, 5000, 10000];
const illustrativeRate = Number(ILLUSTRATIVE_INR_PER_PATH_USD);
const methods = [
  { name: 'Bank Account', subtitle: 'UPI / Net Banking', icon: 'home' },
  {
    name: 'Debit / Credit Card',
    subtitle: 'Visa, Mastercard, Rupay',
    icon: 'wallet',
  },
  {
    name: 'Other Wallet',
    subtitle: 'Deposit from external wallet',
    icon: 'receive',
  },
] as const;

export default function AddMoney() {
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState('Bank Account');
  const parsed = Number(amount);
  const estimate =
    Number.isFinite(parsed) && parsed > 0
      ? (parsed / illustrativeRate).toFixed(2)
      : '0.00';
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
            Add Money
          </Text>
          <Text style={styles.help}>?</Text>
        </View>
        <Text style={styles.preview}>
          Design preview · fiat funding is not available
        </Text>
        <Text style={styles.sectionTitle}>Choose Currency</Text>
        <View style={styles.currencies}>
          <View style={styles.currencyActive}>
            <Text style={styles.currencyActiveText}>◉ pathUSD</Text>
          </View>
          <View style={styles.currency}>
            <Text style={styles.currencyText}>USDT</Text>
          </View>
          <View style={styles.currency}>
            <Text style={styles.currencyText}>INR</Text>
          </View>
        </View>
        <View style={styles.presets}>
          {presets.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: amount === String(value) }}
              onPress={() => setAmount(String(value))}
              style={[
                styles.preset,
                amount === String(value) && styles.presetActive,
              ]}
            >
              <Text style={styles.presetAmount}>
                ₹{value.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.presetEstimate}>
                {(value / illustrativeRate).toFixed(2)} pathUSD
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Or enter amount</Text>
        <View style={styles.amountCard}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            accessibilityLabel="Amount in Indian rupees"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            style={styles.amountInput}
            placeholder="0"
          />
          <Text style={styles.currencyCode}>INR</Text>
          <Text style={styles.estimate}>
            ≈ {estimate} pathUSD · illustrative rate
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methods}>
          {methods.map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={{ selected: method === item.name }}
              onPress={() => setMethod(item.name)}
              style={[
                styles.method,
                method === item.name && styles.methodActive,
              ]}
            >
              <View style={styles.methodIcon}>
                <AppIcon name={item.icon} color={colors.accent} />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodTitle}>{item.name}</Text>
                <Text style={styles.methodSubtitle}>{item.subtitle}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  method === item.name && styles.radioActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Only the Tempo test faucet is available now. Fiat and card deposits
            are not connected.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/review-add-money',
              params: { amount, method },
            })
          }
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            Review ₹
            {Number.isFinite(parsed) ? parsed.toLocaleString('en-IN') : '0'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 26,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  back: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 23, fontWeight: '700', color: colors.ink },
  help: { width: 48, textAlign: 'center', color: colors.ink, fontSize: 25 },
  preview: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  currencies: { flexDirection: 'row', gap: 8 },
  currencyActive: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 11,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyActiveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  currency: {
    flex: 1,
    backgroundColor: '#f5f8fd',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 11,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyText: { color: colors.ink, fontSize: 13 },
  presets: { flexDirection: 'row', gap: 7 },
  preset: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    borderRadius: 11,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  presetActive: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: '#edf5ff',
  },
  presetAmount: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  presetEstimate: { color: colors.muted, fontSize: 9 },
  amountCard: {
    borderColor: colors.accent,
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: '#f3f8ff',
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },
  rupee: { color: colors.ink, fontSize: 30, fontWeight: '700' },
  amountInput: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '700',
    flex: 1,
    minWidth: 100,
  },
  currencyCode: { color: colors.muted, fontSize: 13 },
  estimate: {
    color: colors.muted,
    fontSize: 13,
    width: '100%',
    marginBottom: 8,
  },
  methods: { gap: 10 },
  method: {
    borderColor: '#b7cffa',
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  methodActive: { borderColor: colors.accent, borderWidth: 2 },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: '#e4f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCopy: { flex: 1, gap: 3 },
  methodTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  methodSubtitle: { color: colors.muted, fontSize: 12 },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderColor: colors.accent,
    borderWidth: 2,
  },
  radioActive: { backgroundColor: colors.accent },
  notice: {
    borderColor: '#b7cffa',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f3f8ff',
  },
  noticeText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 13,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
