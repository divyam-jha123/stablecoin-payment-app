import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  inrAmountSchema,
  parseTravelPeQr,
  travelPePayeeName,
  travelPeRecipientAddress,
  vpaSchema,
} from '@traveller/shared';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import {
  createDemoEstimate,
  demoEstimateExpired,
  formatPathUsdAtomic,
  ILLUSTRATIVE_INR_PER_PATH_USD,
  pathUsdBalanceAtomic,
} from '../src/features/payment/amount';
import { uiPreviewEnabled } from '../src/ui-preview';
import { pinStore } from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';
import { colors } from '../src/components/payment-ui';
import {
  SCANNER_DEMO_ACCOUNTS,
  getScannerDemoAccount,
} from '../src/features/payment/scanner-accounts';
import { ScannerTokenSelectionSheet } from '../src/components/scanner-payment-panel';
import { TokenEmblem } from '../src/components/payment-logos';
import { PAYMENT_FINALITY_NOTICE } from '../src/features/legal/legal-documents';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const BLUE = '#2f6bff';
// Typed amounts are whole rupees, up to ₹99,99,999.
const MAX_AMOUNT_DIGITS = 7;
// Links the amount field to the iOS "Done" bar above its number pad.
const AMOUNT_ACCESSORY_ID = 'pay-merchant-amount';

/** A scanned amount without paise ("250.00") is shown as whole rupees. */
function withoutZeroPaise(value: string) {
  return value.replace(/\.0+$/, '');
}

/** Indian digit grouping for a whole-rupee amount, e.g. "2500" -> "2,500". */
function groupRupees(digits: string) {
  return digits ? Number(digits).toLocaleString('en-IN') : '';
}
const SLIDER_HEIGHT = 62;
const THUMB_SIZE = 50;
const SLIDER_PAD = 6;

function Glyph({
  d,
  color,
  size = 22,
  strokeWidth = 2,
}: {
  d: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={tc(color)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Drag the thumb to the end to confirm. Screen readers get a single
 * "activate" action instead of the drag.
 */
function SlideToPay({
  label,
  disabled,
  onComplete,
}: {
  label: string;
  disabled: boolean;
  onComplete: () => void;
}) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const travel = Math.max(0, width - THUMB_SIZE - SLIDER_PAD * 2);
  const done = useRef(false);
  const latest = useRef({ travel, disabled, onComplete });
  latest.current = { travel, disabled, onComplete };

  // Back on this screen (for example after cancelling the PIN), reset it.
  useFocusEffect(
    useCallback(() => {
      done.current = false;
      x.setValue(0);
    }, [x]),
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !latest.current.disabled && !done.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !latest.current.disabled && !done.current && Math.abs(gesture.dx) > 4,
        onPanResponderMove: (_, gesture) => {
          x.setValue(Math.min(Math.max(gesture.dx, 0), latest.current.travel));
        },
        onPanResponderRelease: (_, gesture) => {
          const { travel: max } = latest.current;
          if (max > 0 && gesture.dx >= max * 0.85) {
            done.current = true;
            Animated.timing(x, {
              toValue: max,
              duration: 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => latest.current.onComplete());
          } else {
            Animated.spring(x, {
              toValue: 0,
              friction: 6,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(x, {
            toValue: 0,
            friction: 6,
            useNativeDriver: true,
          }).start();
        },
      }),
    [x],
  );

  const labelOpacity = x.interpolate({
    inputRange: [0, Math.max(1, travel * 0.6)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Slide right to pay"
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate' && !disabled)
          onComplete();
      }}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={[styles.slider, disabled && styles.sliderDisabled]}
    >
      <Animated.Text style={[styles.sliderLabel, { opacity: labelOpacity }]}>
        {label}
      </Animated.Text>
      <Animated.View
        {...responder.panHandlers}
        style={[styles.sliderThumb, { transform: [{ translateX: x }] }]}
      >
        <Glyph
          d="M5 12h14 M13 6l6 6-6 6"
          color={tc(disabled ? '#8294af' : BLUE)}
          size={24}
          strokeWidth={2.5}
        />
      </Animated.View>
    </View>
  );
}

export default function Confirmation() {
  // Redraw in the new colours when the theme switches.
  useScheme();
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
  // A TravelPe scan always shows the real receiver, never the sample merchant.
  const isFigmaPreview =
    !isTravelPe &&
    (!rawMerchantName ||
      rawMerchantName.toLowerCase().includes('starbucks') ||
      uiPreviewEnabled);

  const payeeName =
    isFigmaPreview && !rawMerchantName
      ? 'Starbucks'
      : travelPeRequest
        ? travelPePayeeName(travelPeRequest)
        : rawMerchantName;
  const payeeId = travelPeRequest?.recipientId ?? merchantVpa;
  // A wallet's own receive QR carries its address; paying it moves funds
  // straight to that TravelPe user. The demo profile has no wallet.
  const recipientAddress = travelPeRequest
    ? travelPeRecipientAddress(travelPeRequest.recipientId)
    : null;

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

  // Like Google Pay: a fixed QR amount is shown as is; otherwise entry
  // starts at ₹0 and takes whole rupees.
  const [amount, setAmount] = useState(
    scannedAmountIsValid ? withoutZeroPaise(scannedAmount) : '',
  );
  const [note, setNote] = useState(travelPeRequest?.note ?? '');
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
      ? 'Enter an amount to continue.'
      : null;

  const payInr = amountResult.success
    ? Number(amountResult.data).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })
    : '';
  // The design shows token amounts to two decimals; the payment itself uses
  // the exact estimate.
  const tokenAmount = funds ? Number(funds.required).toFixed(2) : null;
  // A Figma preview with no scanned merchant shows the sample merchant's
  // details; real scans show the payee's UPI or TravelPe ID.
  const payeeDetail =
    isFigmaPreview && !rawMerchantName
      ? 'Cafe & Beverages • Pune, India'
      : payeeId || 'India';
  const initial = Array.from(payeeName.trim())[0]?.toUpperCase() ?? '';

  async function startPayment() {
    setAmountTouched(true);
    if (!amountResult.success || !canPay) return;
    const owner = pinOwner();
    const hasPin = owner
      ? await pinStore.hasPin(owner).catch(() => false)
      : false;
    // The payment PIN approves it; without one, set it first.
    router.push({
      pathname: hasPin ? '/pin-entry' : '/pin-setup',
      params: {
        mode: 'verify',
        next: 'pay',
        merchantName: payeeName,
        // TravelPe IDs are not UPI IDs; only UPI payees can be paid again.
        ...(!isTravelPe && vpaSchema.safeParse(merchantVpa).success
          ? { merchantVpa }
          : {}),
        ...(recipientAddress ? { recipientAddress } : {}),
        location: isFigmaPreview ? 'Pune, Maharashtra' : payeeId || 'India',
        inrAmount: amountResult.data,
        token: paymentSymbol,
      },
    });
  }

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
                styles.squareButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Glyph d="M15 18l-6-6 6-6" color={tc(colors.ink)} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Pay Merchant
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Help"
              hitSlop={10}
              onPress={() =>
                Alert.alert(
                  'About this payment',
                  `You pay in ${paymentSymbol} on the Tempo testnet. INR settlement to the merchant is simulated. Rates are illustrative.`,
                )
              }
              style={({ pressed }) => [
                styles.squareButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle
                  cx={12}
                  cy={12}
                  r={9.5}
                  stroke={tc(colors.ink)}
                  strokeWidth={1.8}
                  fill="none"
                />
                <Path
                  d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.3 M12 16.6h.01"
                  stroke={tc(colors.ink)}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <Text numberOfLines={1} style={styles.merchantName}>
              {payeeName}
            </Text>
            <Text numberOfLines={1} style={styles.merchantDetail}>
              {payeeDetail}
            </Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountSymbol}>₹</Text>
              {/* The phone's number pad. Typed amounts start empty with the
                  cursor already here, like Google Pay. */}
              <TextInput
                accessibilityLabel="Payment amount in Indian rupees"
                editable={!scannedAmountIsValid}
                autoFocus={!scannedAmountIsValid}
                inputMode="numeric"
                keyboardType="number-pad"
                onBlur={() => setAmountTouched(true)}
                onChangeText={(text) =>
                  // Whole rupees: digits only, no leading zeros.
                  setAmount(
                    text
                      .replace(/\D/g, '')
                      .replace(/^0+/, '')
                      .slice(0, MAX_AMOUNT_DIGITS),
                  )
                }
                selectionColor={tc(BLUE)}
                cursorColor={tc(BLUE)}
                style={styles.amountInput}
                value={scannedAmountIsValid ? amount : groupRupees(amount)}
                inputAccessoryViewID={AMOUNT_ACCESSORY_ID}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`About ${tokenAmount ?? '0.00'} ${paymentSymbol}`}
              onPress={() =>
                Alert.alert(
                  'Estimated amount',
                  `Based on an illustrative rate of 1 ${paymentSymbol} ≈ ₹${ILLUSTRATIVE_INR_PER_PATH_USD}. The exact amount is ${funds?.required ?? '—'} ${paymentSymbol}.`,
                )
              }
              style={styles.estimatePill}
            >
              <Text style={styles.estimateText}>
                ≈ {tokenAmount ?? '0.00'} {paymentSymbol}
              </Text>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Circle
                  cx={12}
                  cy={12}
                  r={10}
                  stroke={tc('#7d8aa3')}
                  strokeWidth={1.6}
                  fill="none"
                />
                <Path
                  d="M12 8v.5M12 11v5"
                  stroke={tc('#7d8aa3')}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
            {amountError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {amountError}
              </Text>
            ) : null}
          </View>

          <View style={styles.noteCard}>
            <Glyph
              d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"
              color={tc('#4b5873')}
            />
            <View style={styles.noteCopy}>
              <Text style={styles.noteLabel}>Add a note</Text>
              <TextInput
                accessibilityLabel="Payment note"
                onChangeText={setNote}
                placeholder="What's this payment for?"
                placeholderTextColor={tc('#9aa6ba')}
                selectionColor={tc(BLUE)}
                style={styles.noteInput}
                value={note}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Pay From</Text>
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <TokenEmblem symbol={paymentSymbol} size={50} />
              <View style={styles.accountCopy}>
                <Text style={styles.accountSymbol}>{paymentSymbol}</Text>
                <Text style={styles.accountBalance}>
                  Balance: {selectedDemoEntry.balance.tokens} {paymentSymbol} (₹
                  {selectedDemoEntry.balance.inr})
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change payment token"
                onPress={() => setTokenSheetOpen(true)}
                style={({ pressed }) => [
                  styles.changePill,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.changeText}>Change</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Transaction Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rate:</Text>
              <Text style={styles.detailValue}>
                1 {paymentSymbol} ≈ ₹{ILLUSTRATIVE_INR_PER_PATH_USD}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network Fee:</Text>
              <Text style={styles.freeValue}>Free (Gasless)</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.totalLabel}>You Pay:</Text>
              <Text style={styles.totalValue}>
                {tokenAmount ?? '0.00'} {paymentSymbol}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.finality}>{PAYMENT_FINALITY_NOTICE}</Text>
          <SlideToPay
            label={payInr ? `Slide to Pay ₹${payInr}` : 'Slide to Pay'}
            disabled={!canPay}
            onComplete={() => {
              void AccessibilityInfo.announceForAccessibility?.(
                'Confirm with your PIN',
              );
              void startPayment();
            }}
          />
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
          <View style={styles.keyboardBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done, close keyboard"
              hitSlop={10}
              onPress={Keyboard.dismiss}
            >
              <Text style={styles.keyboardDone}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}

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

const styles = themedStyleSheet({
  flex: { flex: 1 },
  screen: { backgroundColor: '#f2f5fa', flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    marginTop: 4,
  },
  squareButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfe5ee',
    backgroundColor: '#f8fafd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  buttonPressed: { opacity: 0.7 },
  hero: { alignItems: 'center', gap: 4, marginTop: 4 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#c9dcfb',
    borderWidth: 3,
    borderColor: '#e3edfd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: BLUE,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarInitial: { color: '#3767c9', fontSize: 36, fontWeight: '800' },
  merchantName: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  merchantDetail: { color: colors.muted, fontSize: 14 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  amountSymbol: { color: colors.ink, fontSize: 46, fontWeight: '800' },
  amountInput: {
    color: colors.ink,
    fontSize: 52,
    fontWeight: '800',
    minWidth: 40,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  estimatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e4e8ef',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  estimateText: { color: '#3d4a63', fontSize: 14, fontWeight: '500' },
  errorText: { color: '#a92c24', fontSize: 13, marginTop: 6 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: '#cfd7e3',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#f6f8fb',
    marginTop: 8,
  },
  noteCopy: { flex: 1, gap: 2 },
  noteLabel: { color: colors.muted, fontSize: 13 },
  noteInput: { color: colors.ink, fontSize: 16, paddingVertical: 0 },
  sectionLabel: { color: colors.ink, fontSize: 16, marginBottom: -4 },
  card: {
    borderWidth: 1.5,
    borderColor: '#cfd7e3',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  accountCopy: { flex: 1, gap: 2 },
  accountSymbol: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  accountBalance: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  changePill: {
    backgroundColor: '#dce8fb',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  changeText: { color: '#2c5aa8', fontSize: 15, fontWeight: '700' },
  detailsCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: { color: colors.ink, fontSize: 14 },
  detailValue: { color: colors.ink, fontSize: 14 },
  freeValue: { color: '#1f8f4a', fontSize: 14, fontWeight: '500' },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  totalValue: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  finality: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 8,
  },
  keyboardBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#f1f3f7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c8ced8',
  },
  keyboardDone: { color: BLUE, fontSize: 17, fontWeight: '700' },
  slider: {
    height: SLIDER_HEIGHT,
    borderRadius: SLIDER_HEIGHT / 2,
    backgroundColor: '#1f4ea8',
    justifyContent: 'center',
    padding: SLIDER_PAD,
    shadowColor: '#1f4ea8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sliderDisabled: { backgroundColor: '#8294af', shadowOpacity: 0 },
  sliderLabel: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
  },
  sliderThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0052FF',
    borderRadius: 28,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
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
