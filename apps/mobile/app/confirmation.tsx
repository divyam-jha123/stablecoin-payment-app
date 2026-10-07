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
import { inrAmountSchema, vpaSchema } from '@traveller/shared';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import {
  formatPathUsdAtomic,
  ILLUSTRATIVE_INR_PER_PATH_USD,
  pathUsdBalanceAtomic,
  requiredPathUsdAtomic,
} from '../src/features/payment/amount';
import { uiPreviewEnabled } from '../src/ui-preview';
import { AppIcon, colors } from '../src/components/payment-ui';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function Confirmation() {
  const params = useLocalSearchParams<{
    inrAmount?: string | string[];
    merchantName?: string | string[];
    merchantVpa?: string | string[];
  }>();
  const merchantName = firstParam(params.merchantName)?.trim() ?? '';
  const merchantVpa = firstParam(params.merchantVpa)?.trim() ?? '';
  const scannedAmount = firstParam(params.inrAmount)?.trim();
  const merchantIsValid =
    merchantName.length > 0 &&
    merchantName.length <= 120 &&
    vpaSchema.safeParse(merchantVpa).success;
  const scannedAmountIsValid =
    scannedAmount !== undefined &&
    inrAmountSchema.safeParse(scannedAmount).success;
  const [amount, setAmount] = useState(
    scannedAmountIsValid ? scannedAmount : '',
  );
  const [amountTouched, setAmountTouched] = useState(false);
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const address = wallet.account?.address;
  const onTempo = wallet.account?.chainId === TEMPO_CHAIN.id;
  const amountResult = inrAmountSchema.safeParse(amount);

  useEffect(() => {
    if (!uiPreviewEnabled) return walletStore.start();
  }, []);

  const balance = useQuery({
    queryKey: ['tempo-pathUSD', address, wallet.account?.chainId],
    queryFn: () => tempoService.balance(address!),
    enabled: Boolean(!uiPreviewEnabled && address && onTempo && !wallet.busy),
    retry: false,
    staleTime: 0,
  });

  const funds = useMemo(() => {
    if (!amountResult.success) return null;
    const requiredAtomic = requiredPathUsdAtomic(amountResult.data);
    const required = formatPathUsdAtomic(requiredAtomic);
    if (balance.data === undefined) return { required, enough: null };
    try {
      return {
        required,
        enough: pathUsdBalanceAtomic(balance.data) >= requiredAtomic,
      };
    } catch {
      return { required, enough: null };
    }
  }, [amountResult.success, amountResult.data, balance.data]);

  if (!merchantIsValid) {
    return (
      <SafeAreaView style={styles.invalidScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.invalidTitle}>Payment details expired</Text>
        <Text style={styles.invalidCopy}>
          Scan the merchant QR again so Traveller can verify the payment
          details.
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
    !uiPreviewEnabled &&
    amountResult.success &&
    address &&
    onTempo &&
    funds?.enough === true &&
    !balance.isError &&
    !balance.isFetching,
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
              Pay Merchant
            </Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.merchantSection}>
            <View style={styles.merchantMark}>
              <Text style={styles.merchantInitial}>
                {merchantName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.merchantInfo}>
              <Text numberOfLines={2} style={styles.merchantName}>
                {merchantName}
              </Text>
              <Text numberOfLines={1} style={styles.merchantVpa}>
                {merchantVpa}
              </Text>
              <Text style={styles.unverified}>
                Merchant details are unverified
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
                placeholder="0.00"
                placeholderTextColor="#777771"
                selectionColor="#11110f"
                style={styles.amountInput}
                value={amount}
              />
              {scannedAmountIsValid ? (
                <Text style={styles.qrAmountLabel}>Set by QR</Text>
              ) : null}
            </View>
            {amountError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {amountError}
              </Text>
            ) : (
              <Text style={styles.fieldHint}>
                {scannedAmountIsValid
                  ? 'This amount was included by the merchant.'
                  : 'Enter the amount requested by the merchant.'}
              </Text>
            )}
            {amountResult.success && funds ? (
              <Text style={styles.conversion}>
                ≈ {funds.required} pathUSD · illustrative
              </Text>
            ) : null}
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Add a note (optional)</Text>
            <Text style={styles.noteHint}>No note added</Text>
          </View>

          <View style={styles.balanceSection}>
            <View style={styles.payFromHeader}>
              <Text style={styles.payFrom}>Pay from</Text>
              <Text style={styles.changeText}>Tempo testnet</Text>
            </View>
            {uiPreviewEnabled ? (
              <Text style={styles.rateNote}>
                UI preview only. No wallet or payment is connected.
              </Text>
            ) : null}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>pathUSD wallet balance</Text>
              <Text style={styles.balanceValue}>
                {uiPreviewEnabled
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
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>You pay · estimated</Text>
                <Text style={styles.balanceValue}>
                  {funds.required} pathUSD
                </Text>
              </View>
            ) : null}

            <View style={styles.statusRow}>
              {balance.isFetching && address && onTempo ? (
                <ActivityIndicator color="#11110f" size="small" />
              ) : (
                <View
                  style={[
                    styles.statusDot,
                    balance.isError
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
                {uiPreviewEnabled
                  ? 'Balance check unavailable in UI preview.'
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
              Uses an illustrative rate of ₹{ILLUSTRATIVE_INR_PER_PATH_USD} per
              pathUSD. A server-issued quote will replace this before real
              payment submission.
            </Text>
          </View>
          <View style={styles.secureBanner}>
            <Text style={styles.secureTitle}>Secure payment review</Text>
            <Text style={styles.secureCopy}>
              No funds move from this screen. INR settlement is simulated.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {!uiPreviewEnabled && !address ? (
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
          {!uiPreviewEnabled && address && !onTempo ? (
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
          {!uiPreviewEnabled && address && onTempo && balance.isError ? (
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
              Alert.alert(
                'Ready for payment setup',
                'Your amount and test balance are valid. Onchain payment submission is not enabled yet, so no funds were moved.',
              );
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              !canPay && styles.primaryButtonDisabled,
              pressed && canPay && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {amountResult.success ? `Pay ₹${amountResult.data}` : 'Pay'}
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
