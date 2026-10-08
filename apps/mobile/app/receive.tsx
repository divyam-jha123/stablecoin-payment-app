import { useEffect, useMemo, useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import {
  createTravelPeQr,
  hasUnsafeQrTextCharacter,
  inrAmountSchema,
  type TravelPeCurrency,
} from '@traveller/shared';
import { AppIcon, colors } from '../src/components/payment-ui';
import { ReceiveActionButton } from '../src/components/receive-action-button';
import { ReceiveQrCard } from '../src/components/receive-qr-card';
import { useAccount } from '../src/features/account/use-account';
import {
  formatPathUsdAtomic,
  ILLUSTRATIVE_INR_PER_PATH_USD,
  requiredPathUsdAtomic,
} from '../src/features/payment/amount';
import { uiPreviewEnabled } from '../src/ui-preview';

const CURRENCIES: TravelPeCurrency[] = ['USDC', 'USDT', 'pathUSD'];

export default function ReceivePayment() {
  const { wallet } = useAccount();
  const [currency, setCurrency] = useState<TravelPeCurrency>('USDC');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const address = uiPreviewEnabled ? null : wallet.account?.address;
  const recipientName = address
    ? `Traveller ${address.slice(2, 6).toUpperCase()}`
    : 'Divyam Jha';
  const recipientId = address
    ? `${address.slice(2).toLowerCase()}@travelpe`
    : 'divyam@travelpe';
  const amountResult = inrAmountSchema.safeParse(amount);
  const amountError =
    amount.length > 0 && !amountResult.success
      ? 'Enter a positive INR amount with up to two decimals.'
      : null;
  const cleanNote = note.trim();
  const noteError = hasUnsafeQrTextCharacter(cleanNote)
    ? 'Remove special control characters from the note.'
    : null;
  const qrValue = useMemo(() => {
    if (amountError || noteError) return null;
    return createTravelPeQr({
      version: 1,
      recipientId,
      recipientName,
      currency,
      ...(amountResult.success ? { inrAmount: amountResult.data } : {}),
      ...(cleanNote ? { note: cleanNote } : {}),
    });
  }, [
    amountError,
    amountResult.success,
    amountResult.data,
    cleanNote,
    currency,
    noteError,
    recipientId,
    recipientName,
  ]);
  const stablecoinEquivalent = amountResult.success
    ? formatPathUsdAtomic(requiredPathUsdAtomic(amountResult.data))
    : null;

  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    },
    [],
  );

  function showMessage(text: string) {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(''), 2_500);
  }

  async function copyId() {
    try {
      await Clipboard.setStringAsync(recipientId);
      showMessage('TravelPe ID copied.');
    } catch {
      showMessage('Could not copy the TravelPe ID.');
    }
  }

  async function exportQr(action: 'share' | 'download') {
    if (!cardRef.current || !qrValue || busy) return;
    setBusy(true);
    try {
      if (action === 'download') {
        const permission = await requestPermissionsAsync(true, ['photo']);
        if (!permission.granted) {
          showMessage(
            'Photo access denied. Allow saving images in device settings.',
          );
          return;
        }
      } else if (!(await Sharing.isAvailableAsync())) {
        showMessage('Sharing is unavailable on this device.');
        return;
      }

      const imageUri = await captureRef(cardRef.current, {
        format: 'png',
        result: 'tmpfile',
      });
      if (action === 'share') {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share TravelPe QR',
          UTI: 'public.png',
        });
      } else {
        await Asset.create(imageUri);
        showMessage('QR saved to Photos.');
      }
    } catch {
      showMessage(
        action === 'share'
          ? 'Could not share the QR image. Try again.'
          : 'Could not save the QR image. Try again.',
      );
    } finally {
      setBusy(false);
    }
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
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/payments')
              }
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon name="back" size={23} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Receive
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download QR image"
              accessibilityState={{ disabled: !qrValue || busy }}
              disabled={!qrValue || busy}
              onPress={() => void exportQr('download')}
              style={({ pressed }) => [
                styles.headerAction,
                (!qrValue || busy) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon name="download" size={23} />
            </Pressable>
          </View>

          <ReceiveQrCard
            ref={cardRef}
            qrValue={qrValue}
            recipientName={recipientName}
            recipientId={recipientId}
            currency={currency}
            {...(amountResult.success
              ? { requestedAmount: amountResult.data }
              : {})}
            {...(cleanNote && !noteError ? { requestedNote: cleanNote } : {})}
            onCopy={() => void copyId()}
            onChangeCurrency={() => setCurrencyOpen(true)}
          />

          {!address ? (
            <Text style={styles.demoNotice}>
              Demo profile. Connect a wallet to use your own TravelPe ID.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              amountOpen ? 'Hide amount options' : 'Set amount'
            }
            onPress={() => setAmountOpen((open) => !open)}
            style={({ pressed }) => [
              styles.amountAction,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.amountActionText}>
              {amountOpen ? 'Done' : amount ? 'Edit amount' : 'Set amount'}
            </Text>
          </Pressable>

          {amountOpen ? (
            <View style={styles.amountEditor}>
              <Text style={styles.fieldLabel}>
                Request amount in INR (optional)
              </Text>
              <TextInput
                accessibilityLabel="Requested amount in Indian rupees"
                inputMode="decimal"
                keyboardType="decimal-pad"
                maxLength={12}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#77849b"
                style={[styles.input, amountError && styles.inputError]}
                value={amount}
              />
              {amountError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {amountError}
                </Text>
              ) : stablecoinEquivalent ? (
                <Text style={styles.equivalent}>
                  ≈ {stablecoinEquivalent} {currency} at demo rate ₹
                  {ILLUSTRATIVE_INR_PER_PATH_USD} / token
                </Text>
              ) : null}
              <Text style={styles.fieldLabel}>Note (optional)</Text>
              <TextInput
                accessibilityLabel="Payment note"
                maxLength={120}
                onChangeText={setNote}
                placeholder="What is this for?"
                placeholderTextColor="#77849b"
                style={[styles.input, noteError && styles.inputError]}
                value={note}
              />
              {noteError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {noteError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            <ReceiveActionButton
              label={busy ? 'Preparing QR…' : 'Share QR code'}
              icon="share"
              disabled={!qrValue || busy}
              onPress={() => void exportQr('share')}
            />
            <ReceiveActionButton
              label="Open scanner"
              icon="scan"
              outlined
              onPress={() => router.push('/scanner')}
            />
          </View>
          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          ) : null}
          <Text style={styles.footer}>Powered by TravelPe</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={currencyOpen}
        onRequestClose={() => setCurrencyOpen(false)}
      >
        <SafeAreaView style={styles.modalBackdrop} edges={['bottom']}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Receiving currency</Text>
            <Text style={styles.modalCopy}>
              Demo currencies for this hackathon payment request.
            </Text>
            {CURRENCIES.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: option === currency }}
                onPress={() => {
                  setCurrency(option);
                  setCurrencyOpen(false);
                }}
                style={({ pressed }) => [
                  styles.currencyOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.currencyOptionText}>{option}</Text>
                {option === currency ? (
                  <Text style={styles.selected}>Selected</Text>
                ) : null}
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCurrencyOpen(false)}
              style={styles.cancelAction}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  demoNotice: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  amountAction: {
    minHeight: 48,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
  },
  amountActionText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  amountEditor: {
    gap: 9,
    backgroundColor: '#f7faff',
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 48,
    color: colors.ink,
    backgroundColor: '#ffffff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: colors.error },
  error: { color: colors.error, fontSize: 13, lineHeight: 19 },
  equivalent: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  actions: { gap: 12, marginTop: 6 },
  message: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 19, 50, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
    gap: 6,
  },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  modalCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  currencyOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  currencyOptionText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  selected: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  cancelAction: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
});
