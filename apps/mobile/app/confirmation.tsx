import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
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
import { inrAmountSchema, parseTravelPeQr, vpaSchema } from '@traveller/shared';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import {
  createDemoEstimate,
  demoEstimateExpired,
  formatPathUsdAtomic,
  ILLUSTRATIVE_INR_PER_PATH_USD,
  pathUsdBalanceAtomic,
} from '../src/features/payment/amount';
import { uiPreviewEnabled } from '../src/ui-preview';
import { AppIcon, colors } from '../src/components/payment-ui';
import { getScannerDemoAccount } from '../src/features/payment/scanner-accounts';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
  const demoAccount = getScannerDemoAccount(demoPaymentToken);
  const paymentSymbol = demoAccount?.account.symbol ?? 'pathUSD';
  const previewOnly = uiPreviewEnabled && !demoAccount;
  const merchantName = firstParam(params.merchantName)?.trim() ?? '';
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
  const payeeName = travelPeRequest?.recipientName ?? merchantName;
  const payeeId = travelPeRequest?.recipientId ?? merchantVpa;
  const detailsAreValid =
    (demoPaymentToken === undefined || demoAccount !== undefined) &&
    (isTravelPe
      ? travelPeRequest !== null
      : merchantName.length > 0 &&
        merchantName.length <= 120 &&
        vpaSchema.safeParse(merchantVpa).success);
  const scannedAmount = (
    isTravelPe ? travelPeRequest?.inrAmount : firstParam(params.inrAmount)
  )?.trim();
  const scannedAmountIsValid =
    scannedAmount !== undefined &&
    inrAmountSchema.safeParse(scannedAmount).success;
  const [amount, setAmount] = useState(
    scannedAmountIsValid ? scannedAmount : '',
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const [estimateVersion, setEstimateVersion] = useState(0);
  const [now, setNow] = useState(Date.now);
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const address = wallet.account?.address;
  const onTempo = wallet.account?.chainId === TEMPO_CHAIN.id;
  const amountResult = inrAmountSchema.safeParse(amount);
  const estimate = useMemo(
    () =>
      amountResult.success
        ? createDemoEstimate(amountResult.data, Date.now())
        : null,
    // A changed amount or an explicit refresh starts a new demo estimate.
    [amountResult.success, amountResult.data, estimateVersion],
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
      !demoAccount && !uiPreviewEnabled && address && onTempo && !wallet.busy,
    ),
    retry: false,
    staleTime: 0,
  });

  const funds = useMemo(() => {
    if (!estimate) return null;
    const requiredAtomic = estimate.totalPathUsdAtomic;
    const required = formatPathUsdAtomic(requiredAtomic);
    const availableBalance = demoAccount?.balance.tokens ?? balance.data;
    if (availableBalance === undefined) return { required, enough: null };
    try {
      return {
        required,
        enough: pathUsdBalanceAtomic(availableBalance) >= requiredAtomic,
      };
    } catch {
      return { required, enough: null };
    }
  }, [estimate, balance.data, demoAccount]);

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
    !previewOnly &&
    amountResult.success &&
    !estimateIsExpired &&
    funds?.enough === true &&
    (demoAccount ||
      (address && onTempo && !balance.isError && !balance.isFetching)),
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
              <AppIcon name="back" size={21} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              {isTravelPe ? 'Review demo payment' : 'Pay Merchant'}
            </Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.merchantSection}>
            <View style={styles.merchantMark}>
              <Text style={styles.merchantInitial}>
                {payeeName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.merchantInfo}>
              <Text numberOfLines={2} style={styles.merchantName}>
                {payeeName}
              </Text>
              <Text
                numberOfLines={isTravelPe ? undefined : 1}
                style={styles.merchantVpa}
              >
                {payeeId}
              </Text>
              <Text style={styles.unverified}>
                {isTravelPe
                  ? 'TravelPe demo recipient · unverified'
                  : 'Merchant details are unverified'}
              </Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.fieldLabel}>Amount to Pay</Text>
            <View
              style={[
                styles.amountField,
                amountError ? styles.amountFieldError : null,
              ]}
            >
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                accessibilityLabel="Payment amount in Indian rupees"
                editable={!scannedAmountIsValid}
                inputMode="decimal"
                keyboardType="decimal-pad"
                maxLength={12}
                onBlur={() => setAmountTouched(true)}
                onChangeText={setAmount}
                onSubmitEditing={() => setAmountTouched(true)}
                placeholder="Enter amount"
                placeholderTextColor="#777771"
                selectionColor="#11110f"
                style={styles.amountInput}
                value={amount}
              />
              {scannedAmountIsValid ? (
                <Text style={styles.qrAmountLabel}>Requested by QR</Text>
              ) : null}
            </View>
            {amountError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {amountError}
              </Text>
            ) : (
              <Text style={styles.fieldHint}>
                {scannedAmountIsValid
                  ? isTravelPe
                    ? 'This INR amount was requested in the TravelPe QR.'
                    : 'This amount was included by the merchant.'
                  : isTravelPe
                    ? 'Enter an INR amount for this demo payment.'
                    : 'Enter the amount requested by the merchant.'}
              </Text>
            )}
            {amountResult.success && funds ? (
              <Text style={styles.conversion}>
                ≈ {funds.required} {paymentSymbol} · demo estimate
              </Text>
            ) : null}
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>
              {isTravelPe ? 'Payment note' : 'Add a note (optional)'}
            </Text>
            <Text style={styles.noteHint}>
              {travelPeRequest?.note ?? 'No note added'}
            </Text>
          </View>

          <View style={styles.balanceSection}>
            <View style={styles.payFromHeader}>
              <Text style={styles.payFrom}>Pay from</Text>
              <Text style={styles.changeText}>
                {demoAccount ? 'Demo account' : 'Tempo testnet'}
              </Text>
            </View>
            {travelPeRequest ? (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>
                  Receiving currency · demo
                </Text>
                <Text style={styles.balanceValue}>
                  {travelPeRequest.currency}
                </Text>
              </View>
            ) : null}
            {previewOnly ? (
              <Text style={styles.rateNote}>
                UI preview only. No wallet or payment is connected.
              </Text>
            ) : null}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>
                {paymentSymbol} {demoAccount ? 'demo' : 'wallet'} balance
              </Text>
              <Text style={styles.balanceValue}>
                {demoAccount
                  ? `${demoAccount.balance.tokens} ${paymentSymbol}`
                  : previewOnly
                    ? '—'
                    : !address
                      ? 'Wallet not connected'
                      : !onTempo
                        ? 'Wrong network'
                        : balance.isFetching && balance.data === undefined
                          ? 'Checking…'
                          : balance.data !== undefined
                            ? `${balance.data} pathUSD${balance.isError ? ' (last known)' : ''}`
                            : 'Unavailable'}
              </Text>
            </View>

            {amountResult.success && funds ? (
              <>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>
                    {isTravelPe ? 'Requested INR amount' : 'Merchant amount'}
                  </Text>
                  <Text style={styles.balanceValue}>
                    ₹{estimate?.amountInr}
                  </Text>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Demo exchange rate</Text>
                  <Text style={styles.balanceValue}>
                    ₹{ILLUSTRATIVE_INR_PER_PATH_USD} / {paymentSymbol}
                  </Text>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Demo fee</Text>
                  <Text style={styles.balanceValue}>₹{estimate?.feeInr}</Text>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>
                    Total test tokens required
                  </Text>
                  <Text style={styles.balanceValue}>
                    {funds.required} {paymentSymbol}
                  </Text>
                </View>
                {travelPeRequest ? (
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>
                      Demo recipient equivalent
                    </Text>
                    <Text style={styles.balanceValue}>
                      ≈ {funds.required} {travelPeRequest.currency}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {estimateIsExpired ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setEstimateVersion((version) => version + 1);
                  setNow(Date.now());
                  if (!demoAccount && address && onTempo)
                    void balance.refetch();
                }}
                style={styles.refreshEstimate}
              >
                <Text style={styles.refreshEstimateText}>
                  Refresh demo estimate
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.statusRow}>
              {!demoAccount && balance.isFetching && address && onTempo ? (
                <ActivityIndicator color="#11110f" size="small" />
              ) : (
                <View
                  style={[
                    styles.statusDot,
                    !demoAccount && balance.isError
                      ? styles.statusDotError
                      : funds?.enough === true
                        ? styles.statusDotSuccess
                        : funds?.enough === false
                          ? styles.statusDotError
                          : styles.statusDotNeutral,
                  ]}
                />
              )}
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.statusText,
                  funds?.enough === false ? styles.errorStatusText : null,
                ]}
              >
                {previewOnly
                  ? 'Balance check unavailable in UI preview.'
                  : estimateIsExpired
                    ? 'Demo estimate expired. Refresh it to continue.'
                    : demoAccount
                      ? funds?.enough === true
                        ? 'You have enough demo funds for this amount.'
                        : funds?.enough === false
                          ? `Insufficient ${paymentSymbol} demo balance.`
                          : 'Enter an amount to check your demo funds.'
                      : !address
                        ? 'Connect your wallet to check funds.'
                        : !onTempo
                          ? 'Switch to Tempo Moderato testnet to continue.'
                          : balance.isError
                            ? `Balance check failed: ${walletError(balance.error)}`
                            : funds?.enough === true
                              ? 'You have enough test funds for this amount.'
                              : funds?.enough === false
                                ? 'Insufficient pathUSD test balance.'
                                : amountResult.success
                                  ? 'Checking whether you have enough funds…'
                                  : 'Enter an amount to check your funds.'}
              </Text>
            </View>

            <Text style={styles.rateNote}>
              Demo estimate includes a ₹{estimate?.feeInr ?? '0.00'} fee and
              expires after 2 minutes. A server-issued quote is required before
              real payment submission.
            </Text>
          </View>
          <View style={styles.secureBanner}>
            <Text style={styles.secureTitle}>Secure payment review</Text>
            <Text style={styles.secureCopy}>
              {isTravelPe
                ? 'No tokens move from this screen. This TravelPe payment is simulated.'
                : 'No funds move from this screen. INR settlement is simulated.'}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {!demoAccount && !uiPreviewEnabled && !address ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/connect')}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Connect wallet</Text>
            </Pressable>
          ) : null}
          {!demoAccount && !uiPreviewEnabled && address && !onTempo ? (
            <Pressable
              accessibilityRole="button"
              disabled={wallet.busy}
              onPress={() => void walletStore.switchToTempo()}
              style={({ pressed }) => [
                styles.secondaryButton,
                wallet.busy && styles.secondaryButtonDisabled,
                pressed && !wallet.busy && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {wallet.busy ? 'Switching network…' : 'Switch to Tempo testnet'}
              </Text>
            </Pressable>
          ) : null}
          {!demoAccount &&
          !uiPreviewEnabled &&
          address &&
          onTempo &&
          balance.isError ? (
            <Pressable
              accessibilityRole="button"
              disabled={balance.isFetching}
              onPress={() => void balance.refetch()}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                Retry balance check
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPay }}
            disabled={!canPay}
            onPress={() => {
              setAmountTouched(true);
              if (
                estimate &&
                demoEstimateExpired(estimate.expiresAt, Date.now())
              ) {
                setNow(Date.now());
                return;
              }
              Alert.alert(
                demoAccount
                  ? 'Demo payment complete'
                  : 'Ready for payment setup',
                demoAccount
                  ? `Simulated ₹${amountResult.success ? amountResult.data : amount} to ${payeeName} using ${paymentSymbol}. No funds were moved.`
                  : 'Your amount and test balance are valid. Onchain payment submission is not enabled yet, so no funds were moved.',
              );
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              !canPay && styles.primaryButtonDisabled,
              pressed && canPay && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isTravelPe || demoAccount
                ? amountResult.success
                  ? `Demo pay ₹${amountResult.data}`
                  : 'Demo pay'
                : amountResult.success
                  ? `Pay ₹${amountResult.data}`
                  : 'Pay'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: '#f2f2f7', flex: 1 },
  content: { flexGrow: 1, paddingBottom: 28, paddingHorizontal: 26, gap: 10 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backIcon: {
    color: '#11110f',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 40,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  topBarSpacer: { width: 44 },
  merchantSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  merchantMark: {
    alignItems: 'center',
    backgroundColor: '#e0efff',
    borderRadius: 30,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  merchantInitial: { color: colors.accent, fontSize: 23, fontWeight: '700' },
  merchantInfo: { flex: 1, gap: 3 },
  merchantName: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  merchantVpa: {
    color: colors.muted,
    fontSize: 12,
  },
  unverified: { color: '#7c5d16', fontSize: 11 },
  amountSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginTop: 2,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 9,
  },
  amountField: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#b5c9e8',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 18,
  },
  amountFieldError: { borderColor: '#a92c24' },
  currencySymbol: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '500',
    marginRight: 8,
  },
  amountInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 34,
    fontWeight: '600',
    minWidth: 0,
    paddingVertical: 12,
  },
  qrAmountLabel: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  fieldHint: {
    color: '#6d6d67',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  errorText: {
    color: '#a92c24',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  conversion: { color: colors.muted, fontSize: 14, marginTop: 8 },
  noteCard: {
    backgroundColor: '#e9f3ff',
    borderColor: '#b3d2ff',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  noteLabel: { color: colors.muted, fontSize: 14 },
  noteHint: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  balanceSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  payFromHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payFrom: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  changeText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  balanceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  balanceLabel: { color: colors.muted, flex: 1, fontSize: 14 },
  balanceValue: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    marginLeft: 16,
    textAlign: 'right',
  },
  statusRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 6,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 10,
    marginTop: 5,
    width: 10,
  },
  statusDotSuccess: { backgroundColor: '#27834d' },
  statusDotError: { backgroundColor: '#a92c24' },
  statusDotNeutral: { backgroundColor: '#8a8982' },
  statusText: {
    color: '#3f3f3b',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  errorStatusText: { color: '#a92c24' },
  rateNote: { color: '#777771', fontSize: 12, lineHeight: 18, marginTop: 17 },
  refreshEstimate: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
  },
  refreshEstimateText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  secureBanner: {
    borderWidth: 1,
    borderColor: '#b7d3ff',
    backgroundColor: '#eef6ff',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  secureTitle: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  secureCopy: { color: colors.muted, fontSize: 12 },
  footer: {
    backgroundColor: '#f2f2f7',
    borderTopColor: '#deddd7',
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
  },
  primaryButtonDisabled: { backgroundColor: '#8294af' },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#11110f',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#11110f',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.65 },
  invalidScreen: {
    backgroundColor: '#f7f6f2',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  invalidTitle: { color: '#11110f', fontSize: 26, fontWeight: '700' },
  invalidCopy: {
    color: '#62625d',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    marginTop: 10,
  },
});
