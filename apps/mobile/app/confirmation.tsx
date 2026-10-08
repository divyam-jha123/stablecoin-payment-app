import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { inrAmountSchema, parseTravelPeQr, vpaSchema } from '@traveller/shared';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import {
  createDemoEstimate,
  demoEstimateExpired,
  formatPathUsdAtomic,
  pathUsdBalanceAtomic,
} from '../src/features/payment/amount';
import { uiPreviewEnabled } from '../src/ui-preview';
import { AppIcon, colors } from '../src/components/payment-ui';
import {
  SCANNER_DEMO_ACCOUNTS,
  getScannerDemoAccount,
} from '../src/features/payment/scanner-accounts';
import { ScannerTokenSelectionSheet } from '../src/components/scanner-payment-panel';
import {
  StarbucksLogo,
  UsdcTokenEmblem,
} from '../src/components/payment-logos';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function CoffeeCupIllustration({ size = 80 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size * 0.55,
          borderRadius: size * 0.28,
          backgroundColor: '#e6f0fa',
          bottom: 2,
        }}
      />
      <Svg width={size * 0.72} height={size * 0.88} viewBox="0 0 40 50">
        <Rect
          x="8"
          y="2"
          width="24"
          height="4"
          rx="2"
          fill="#ffffff"
          stroke="#d5dde8"
          strokeWidth="1"
        />
        <Rect
          x="6"
          y="5"
          width="28"
          height="3"
          rx="1.5"
          fill="#f8fafc"
          stroke="#d5dde8"
          strokeWidth="0.8"
        />
        <Path
          d="M7 8 L10 44 C10.5 46, 29.5 46, 30 44 L33 8 Z"
          fill="#fbfbfd"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <Path
          d="M8.5 19 L9.5 32 C10 33.5, 30 33.5, 30.5 32 L31.5 19 Z"
          fill="#f3ede2"
        />
        <Circle cx="20" cy="25.5" r="5" fill="#00704A" />
        <Circle cx="20" cy="25.5" r="3.2" fill="#ffffff" />
        <Circle cx="20" cy="25.5" r="2.2" fill="#00704A" />
      </Svg>
    </View>
  );
}

export default function Confirmation() {
  const params = useLocalSearchParams<{
    inrAmount?: string | string[];
    merchantName?: string | string[];
    merchantVpa?: string | string[];
    travelPeQr?: string | string[];
    demoPaymentToken?: string | string[];
  }>();

  const demoPaymentToken = firstParam(params.demoPaymentToken);
  const initialDemoAccount =
    getScannerDemoAccount(demoPaymentToken) ?? SCANNER_DEMO_ACCOUNTS[0]!;
  const [selectedDemoEntry, setSelectedDemoEntry] =
    useState(initialDemoAccount);
  const [tokenSheetOpen, setTokenSheetOpen] = useState(false);

  const rawMerchantName = firstParam(params.merchantName)?.trim() ?? '';
  const merchantVpa = firstParam(params.merchantVpa)?.trim() ?? '';
  const travelPeQr = firstParam(params.travelPeQr);

  const travelPeRequest = useMemo(() => {
    if (!travelPeQr) return null;
    try {
      return parseTravelPeQr(travelPeQr);
    } catch {
      return null;
    }
  }, [travelPeQr]);

  const isTravelPe = travelPeQr !== undefined;
  const isFigmaPreview =
    !rawMerchantName ||
    rawMerchantName.toLowerCase().includes('starbucks') ||
    uiPreviewEnabled;

  const payeeName =
    isFigmaPreview && !rawMerchantName
      ? 'Starbucks'
      : (travelPeRequest?.recipientName ?? rawMerchantName);
  const payeeId = travelPeRequest?.recipientId ?? merchantVpa;

  const detailsAreValid =
    isFigmaPreview ||
    ((demoPaymentToken === undefined || initialDemoAccount !== undefined) &&
      (isTravelPe
        ? travelPeRequest !== null
        : rawMerchantName.length > 0 &&
          rawMerchantName.length <= 120 &&
          vpaSchema.safeParse(merchantVpa).success));

  const scannedAmount = (
    isTravelPe ? travelPeRequest?.inrAmount : firstParam(params.inrAmount)
  )?.trim();
  const scannedAmountIsValid =
    scannedAmount !== undefined &&
    inrAmountSchema.safeParse(scannedAmount).success;

  const [amount, setAmount] = useState(
    scannedAmountIsValid ? scannedAmount : isFigmaPreview ? '480' : '',
  );
  const [note, setNote] = useState(
    isFigmaPreview ? 'Coffee ☕' : (travelPeRequest?.note ?? ''),
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const [now, setNow] = useState(Date.now);

  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const address = wallet.account?.address;
  const onTempo = wallet.account?.chainId === TEMPO_CHAIN.id;
  const paymentSymbol = selectedDemoEntry.account.symbol;

  const amountResult = inrAmountSchema.safeParse(amount);
  const estimate = useMemo(
    () =>
      amountResult.success
        ? createDemoEstimate(amountResult.data, Date.now())
        : null,
    [amountResult.success, amountResult.data],
  );

  const estimateIsExpired = estimate
    ? demoEstimateExpired(estimate.expiresAt, now)
    : false;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uiPreviewEnabled) return walletStore.start();
  }, []);

  const balance = useQuery({
    queryKey: ['tempo-pathUSD', address, wallet.account?.chainId],
    queryFn: () => tempoService.balance(address!),
    enabled: Boolean(
      !selectedDemoEntry &&
      !uiPreviewEnabled &&
      address &&
      onTempo &&
      !wallet.busy,
    ),
    retry: false,
    staleTime: 0,
  });

  const funds = useMemo(() => {
    if (!estimate) return null;
    const requiredAtomic = estimate.totalPathUsdAtomic;
    const required = formatPathUsdAtomic(requiredAtomic);
    const availableBalance = selectedDemoEntry?.balance.tokens ?? balance.data;
    if (availableBalance === undefined) return { required, enough: null };
    try {
      return {
        required,
        enough: pathUsdBalanceAtomic(availableBalance) >= requiredAtomic,
      };
    } catch {
      return { required, enough: null };
    }
  }, [estimate, balance.data, selectedDemoEntry]);

  if (!detailsAreValid) {
    return (
      <SafeAreaView style={styles.invalidScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.invalidTitle}>Invalid payment details</Text>
        <Text style={styles.invalidCopy}>
          Scan the payment QR again to review its recipient and amount.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/scanner')}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Scan again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const canPay = Boolean(
    amountResult.success &&
    // The UI preview keeps Pay available while a screen is under review.
    (uiPreviewEnabled || !estimateIsExpired) &&
    (selectedDemoEntry || funds?.enough === true),
  );

  const amountError =
    amountTouched && !amountResult.success
      ? amount.length === 0
        ? 'Enter an amount to continue.'
        : 'Enter a positive INR amount with up to two decimals.'
      : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke="#081332"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Pay Merchant
            </Text>
            <View style={styles.topBarSpacer} />
          </View>

          {/* Merchant Card */}
          <View style={styles.merchantCard}>
            {payeeName.toLowerCase().includes('starbucks') ? (
              <StarbucksLogo size={52} />
            ) : (
              <View style={styles.merchantMark}>
                <Text style={styles.merchantInitial}>
                  {payeeName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.merchantInfo}>
              <Text numberOfLines={1} style={styles.merchantName}>
                {payeeName}
              </Text>
              <Text style={styles.merchantCategory}>Cafe & Beverages</Text>
              <View style={styles.locationRow}>
                <Svg width={13} height={13} viewBox="0 0 24 24">
                  <Path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
                    fill="#5b6b85"
                  />
                </Svg>
                <Text style={styles.locationText}>
                  {isFigmaPreview ? 'Pune, India' : payeeId || 'India'}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View merchant details"
              style={({ pressed }) => [
                styles.viewDetailsPill,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.viewDetailsText}>View Details ›</Text>
            </Pressable>
          </View>

          {/* Amount to Pay Card */}
          <View style={styles.amountCard}>
            <View style={styles.amountHeader}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <View style={styles.currencyPill}>
                <Text style={styles.currencyPillText}>INR</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path
                    d="M6 9l6 6 6-6"
                    stroke="#081332"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </View>
            </View>

            <View style={styles.amountBodyRow}>
              <View style={styles.amountValueColumn}>
                <View style={styles.amountInputRow}>
                  <Text style={styles.amountSymbol}>₹</Text>
                  <TextInput
                    accessibilityLabel="Payment amount in Indian rupees"
                    editable={!scannedAmountIsValid}
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    maxLength={10}
                    onBlur={() => setAmountTouched(true)}
                    onChangeText={setAmount}
                    placeholder="480"
                    placeholderTextColor="#5b6b85"
                    selectionColor="#005ae1"
                    style={styles.amountInput}
                    value={amount}
                  />
                </View>
                <View style={styles.estimateRow}>
                  <Text style={styles.estimateText}>
                    ≈ {funds?.required ?? '5.72'} {paymentSymbol}
                  </Text>
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Circle
                      cx={12}
                      cy={12}
                      r={10}
                      stroke="#5b6b85"
                      strokeWidth={1.5}
                      fill="none"
                    />
                    <Path
                      d="M12 8v.5M12 11v5"
                      stroke="#5b6b85"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
              </View>
              <CoffeeCupIllustration size={80} />
            </View>
            {amountError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {amountError}
              </Text>
            ) : null}
          </View>

          {/* Add a note card */}
          <View style={styles.noteCard}>
            <View style={styles.noteIconCircle}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  stroke="#5b6b85"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke="#5b6b85"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
            <View style={styles.noteCopy}>
              <Text style={styles.noteLabel}>Add a note (optional)</Text>
              <TextInput
                accessibilityLabel="Payment note"
                onChangeText={setNote}
                placeholder="Coffee ☕"
                placeholderTextColor="#5b6b85"
                selectionColor="#005ae1"
                style={styles.noteInput}
                value={note}
              />
            </View>
          </View>

          {/* Pay from section */}
          <View style={styles.payFromSection}>
            <View style={styles.payFromHeader}>
              <Text style={styles.payFromTitle}>Pay from</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change payment token"
                onPress={() => setTokenSheetOpen(true)}
                style={({ pressed }) => [
                  styles.changeButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedDemoEntry.account.symbol}, balance ${selectedDemoEntry.balance.inr} rupees. Tap to change`}
              onPress={() => setTokenSheetOpen(true)}
              style={({ pressed }) => [
                styles.accountCard,
                pressed && styles.buttonPressed,
              ]}
            >
              <UsdcTokenEmblem />
              <View style={styles.accountCopy}>
                <Text style={styles.accountSymbol}>
                  {selectedDemoEntry.account.symbol}
                </Text>
                <Text style={styles.accountInr}>
                  ₹ {selectedDemoEntry.balance.inr}
                </Text>
                <Text style={styles.accountTokens}>
                  ≈ {selectedDemoEntry.balance.tokens}{' '}
                  {selectedDemoEntry.account.symbol}
                </Text>
              </View>
              <View style={styles.chevronCircle}>
                <AppIcon name="chevron-down" size={16} color="#005ae1" />
              </View>
            </Pressable>
          </View>

          {/* Breakdown Card */}
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>You Pay</Text>
              <Text style={styles.breakdownValue}>
                {funds?.required ?? '5.72'} {paymentSymbol}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.labelWithIcon}>
                <Text style={styles.breakdownLabel}>Network Fee</Text>
                <Svg width={13} height={13} viewBox="0 0 24 24">
                  <Circle
                    cx={12}
                    cy={12}
                    r={10}
                    stroke="#5b6b85"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  <Path
                    d="M12 8v.5M12 11v5"
                    stroke="#5b6b85"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.breakdownValue}>0.00 {paymentSymbol}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {funds?.required ?? '5.72'} {paymentSymbol}
              </Text>
            </View>
          </View>

          {/* Secure & Instant Payment Card */}
          <View style={styles.secureCard}>
            <View style={styles.shieldContainer}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                  d="M12 2L4 5v6.5C4 17 7.5 21 12 22c4.5-1 8-5 8-10.5V5l-8-3z"
                  fill="#005ae1"
                />
                <Path
                  d="M10 11a2 2 0 1 1 4 0v1h1v4H9v-4h1v-1zm1 0h2v-1a1 1 0 0 0-2 0v1z"
                  fill="#ffffff"
                />
              </Svg>
            </View>
            <View style={styles.secureCopy}>
              <Text style={styles.secureTitle}>Secure & Instant Payment</Text>
              <Text style={styles.secureSubtitle}>
                Settles on-chain • No gas fees for you
              </Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                d="M9 18l6-6-6-6"
                stroke="#005ae1"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        </ScrollView>

        {/* Footer / Primary Button */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPay }}
            disabled={!canPay}
            onPress={() => {
              setAmountTouched(true);
              if (!amountResult.success) return;
              router.push({
                pathname: '/processing',
                params: {
                  merchantName: payeeName,
                  location: isFigmaPreview
                    ? 'Pune, Maharashtra'
                    : payeeId || 'India',
                  inrAmount: amountResult.data,
                  token: paymentSymbol,
                },
              });
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              !canPay && styles.primaryButtonDisabled,
              pressed && canPay && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              Pay ₹{amountResult.success ? amountResult.data : amount || '480'}
            </Text>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="#ffffff"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ScannerTokenSelectionSheet
        visible={tokenSheetOpen}
        selectedAccount={selectedDemoEntry.account}
        onClose={() => setTokenSheetOpen(false)}
        onSelect={(account) => {
          const entry = SCANNER_DEMO_ACCOUNTS.find(
            (item) => item.account.symbol === account.symbol,
          );
          if (entry) setSelectedDemoEntry(entry);
          setTokenSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: '#f4f6fa', flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    marginTop: 4,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  title: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  topBarSpacer: { width: 42 },

  /* Merchant Card */
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#081332',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  merchantMark: {
    alignItems: 'center',
    backgroundColor: '#e0efff',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  merchantInitial: { color: colors.accent, fontSize: 23, fontWeight: '700' },
  merchantInfo: { flex: 1, gap: 2 },
  merchantName: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  merchantCategory: { color: colors.muted, fontSize: 13 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: colors.muted, fontSize: 12 },
  viewDetailsPill: {
    backgroundColor: '#eef4ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewDetailsText: { color: '#005ae1', fontSize: 12, fontWeight: '700' },

  /* Amount to Pay Card */
  amountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8edf5',
    padding: 20,
    gap: 12,
    shadowColor: '#081332',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: { color: colors.muted, fontSize: 14, fontWeight: '500' },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f4f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  currencyPillText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  amountBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountValueColumn: { flex: 1, gap: 4 },
  amountInputRow: { flexDirection: 'row', alignItems: 'baseline' },
  amountSymbol: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    marginRight: 2,
  },
  amountInput: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '800',
    minWidth: 100,
    paddingVertical: 0,
  },
  estimateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estimateText: { color: colors.muted, fontSize: 14, fontWeight: '500' },

  /* Note Card */
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#edf5ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d2e3fc',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  noteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCopy: { flex: 1, gap: 2 },
  noteLabel: { color: colors.muted, fontSize: 12 },
  noteInput: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },

  /* Pay from section */
  payFromSection: { gap: 8 },
  payFromHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payFromTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  changeButton: { paddingVertical: 4 },
  changeButtonText: { color: '#005ae1', fontSize: 15, fontWeight: '600' },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#c6dcff',
    padding: 16,
    shadowColor: '#081332',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  accountCopy: { flex: 1, gap: 2 },
  accountSymbol: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  accountInr: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  accountTokens: { color: colors.muted, fontSize: 13 },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#edf4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Breakdown Card */
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e8edf5',
    padding: 18,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: { color: colors.muted, fontSize: 14 },
  breakdownValue: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginVertical: 4,
  },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  totalValue: { color: colors.ink, fontSize: 16, fontWeight: '700' },

  /* Secure card */
  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#edf5ff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d2e3fc',
    padding: 14,
  },
  shieldContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureCopy: { flex: 1, gap: 2 },
  secureTitle: { color: '#005ae1', fontSize: 15, fontWeight: '700' },
  secureSubtitle: { color: colors.muted, fontSize: 12 },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#f4f6fa',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0052FF',
    borderRadius: 28,
    minHeight: 56,
    paddingHorizontal: 20,
    shadowColor: '#0052FF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonDisabled: { backgroundColor: '#8294af', shadowOpacity: 0 },
  primaryButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  buttonPressed: { opacity: 0.7 },
  errorText: { color: '#a92c24', fontSize: 13, marginTop: 4 },

  invalidScreen: {
    backgroundColor: '#f4f6fa',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  invalidTitle: { color: colors.ink, fontSize: 26, fontWeight: '700' },
  invalidCopy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    marginTop: 10,
  },
});
