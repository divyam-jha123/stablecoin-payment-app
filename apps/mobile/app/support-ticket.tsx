import { useState, useSyncExternalStore } from 'react';
import { router, Stack } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import {
  Alert,
  Image,
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
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors } from '../src/components/payment-ui';
import { walletStore } from '../src/features/account/metamask';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  toTransactionItem,
  type TransactionItem,
} from '../src/features/payment/simulated-payments';
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  ISSUE_TYPES,
  type IssueType,
  type SupportTicket,
} from '../src/features/support/support';
import { supportTicketStore } from '../src/features/support/support-ticket-store';
import { previewDashboardWith } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

const BLUE = '#2f6bff';
const INK = '#0b0f1f';
const GREEN = '#22a35a';
const CHECK = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12.3l2.7 2.7L16.2 9.5';
const MAX_TRANSACTIONS = 10;

function Glyph({
  d,
  color,
  size = 22,
}: {
  d: string;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function transactionLabel(transaction: TransactionItem) {
  const amount = transaction.amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${transaction.name} - ₹${amount}`;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/help');
}

export default function SupportTicketScreen() {
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const address = wallet.account?.address;
  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  const transactions = (
    uiPreviewEnabled
      ? previewDashboardWith(payments).transactions
      : payments.map(toTransactionItem)
  ).slice(0, MAX_TRANSACTIONS);
  const owner = uiPreviewEnabled
    ? 'ui-preview'
    : (address?.toLowerCase() ?? 'guest');

  const [issueType, setIssueType] = useState<IssueType>('Transaction Issue');
  const [typesOpen, setTypesOpen] = useState(false);
  // The most recent payment is attached until the user picks another or none.
  const [transactionId, setTransactionId] = useState<string | null | undefined>(
    undefined,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SupportTicket | null>(null);

  const transaction =
    transactionId === undefined
      ? (transactions[0] ?? null)
      : (transactions.find((item) => item.id === transactionId) ?? null);
  const ready = description.trim().length >= DESCRIPTION_MIN;

  async function pickAttachment() {
    try {
      const picked = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      const uri = picked.canceled ? null : picked.assets[0]?.uri;
      if (uri) setAttachmentUri(uri);
    } catch {
      Alert.alert('Could not open photos', 'Please try again.');
    }
  }

  function submit() {
    const result = supportTicketStore.add(owner, {
      issueType,
      transaction: transaction
        ? { id: transaction.id, label: transactionLabel(transaction) }
        : null,
      description,
      attachmentUri,
    });
    if (result.ok) {
      setError(null);
      setSaved(result.ticket);
    } else setError(result.error);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={goBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Glyph d="M15 18l-6-6 6-6" color={BLUE} size={26} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Raise a Support Ticket
          </Text>

          {saved ? (
            <View style={styles.done}>
              <View style={styles.doneIcon}>
                <Glyph d={CHECK} color={GREEN} size={36} />
              </View>
              <Text style={styles.doneTitle}>Ticket saved</Text>
              <Text selectable style={styles.reference}>
                {saved.reference}
              </Text>
              <Text style={styles.doneCopy}>
                Support is not connected yet, so this ticket is saved on this
                phone. Keep the reference to quote it later.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={goBack}
                style={({ pressed }) => [
                  styles.submit,
                  styles.doneButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitText}>Back to Help</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Select Issue Type</Text>
                <View style={styles.divider} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Issue type, ${issueType}`}
                  accessibilityState={{ expanded: typesOpen }}
                  onPress={() => setTypesOpen(!typesOpen)}
                  style={({ pressed }) => [
                    styles.selectRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.value}>{issueType}</Text>
                  <View style={typesOpen && styles.flip}>
                    <Glyph d="M6 9l6 6 6-6" color={INK} size={20} />
                  </View>
                </Pressable>
                {typesOpen
                  ? ISSUE_TYPES.filter((type) => type !== issueType).map(
                      (type) => (
                        <Pressable
                          key={type}
                          accessibilityRole="button"
                          onPress={() => {
                            setIssueType(type);
                            setTypesOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.option,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.optionText}>{type}</Text>
                        </Pressable>
                      ),
                    )
                  : null}
              </View>

              <Text style={[styles.label, styles.indented]}>
                Related Transaction (optional)
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  transaction
                    ? `Related transaction, ${transactionLabel(transaction)}`
                    : 'Related transaction, none'
                }
                accessibilityState={{ disabled: !transactions.length }}
                disabled={!transactions.length}
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [
                  styles.card,
                  styles.transactionRow,
                  pressed && styles.pressed,
                ]}
              >
                {transaction ? (
                  <View style={styles.checkCircle}>
                    <Glyph d={CHECK} color={GREEN} size={22} />
                  </View>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[styles.value, !transaction && styles.placeholder]}
                >
                  {transaction
                    ? transactionLabel(transaction)
                    : transactions.length
                      ? 'Choose a payment'
                      : 'No payments yet'}
                </Text>
                {transactions.length ? (
                  <Glyph d="M9 6l6 6-6 6" color={INK} size={20} />
                ) : null}
              </Pressable>

              <Text style={styles.label}>Describe your problem</Text>
              <TextInput
                accessibilityLabel="Describe your problem"
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  setError(null);
                }}
                placeholder="Tell us more about the issue..."
                placeholderTextColor="#7d8aa3"
                multiline
                maxLength={DESCRIPTION_MAX}
                textAlignVertical="top"
                style={[styles.card, styles.textArea]}
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}

              <Text style={styles.label}>Attachment</Text>
              <View style={[styles.card, styles.attachRow]}>
                {attachmentUri ? (
                  <>
                    <Image
                      source={{ uri: attachmentUri }}
                      style={styles.thumb}
                    />
                    <Text style={[styles.value, styles.flex]}>
                      Screenshot added
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove attachment"
                      hitSlop={10}
                      onPress={() => setAttachmentUri(null)}
                    >
                      <Glyph d="M6 6l12 12 M18 6L6 18" color={INK} size={20} />
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void pickAttachment()}
                    style={({ pressed }) => [
                      styles.attachButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.plus}>
                      <Glyph d="M12 5v14 M5 12h14" color="#5b6b85" size={22} />
                    </View>
                    <Text style={styles.value}>Add a screenshot</Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready }}
                disabled={!ready}
                onPress={submit}
                style={({ pressed }) => [
                  styles.submit,
                  !ready && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitText}>Submit Ticket</Text>
                <Glyph d="M9 6l6 6-6 6" color="#ffffff" size={20} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <DashboardNav current="/profile" />

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close"
          style={styles.backdrop}
          onPress={() => setPickerOpen(false)}
        />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Related Transaction</Text>
          <ScrollView style={styles.sheetList}>
            {[null, ...transactions].map((item) => {
              const selected = (transaction?.id ?? null) === (item?.id ?? null);
              return (
                <Pressable
                  key={item?.id ?? 'none'}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setTransactionId(item?.id ?? null);
                    setPickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.sheetRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={styles.value}>
                      {item ? transactionLabel(item) : 'No transaction'}
                    </Text>
                    {item ? (
                      <Text style={styles.sheetMeta}>{item.time}</Text>
                    ) : null}
                  </View>
                  {selected ? (
                    <Glyph d={CHECK} color={GREEN} size={22} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: '#0b2a6b',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f6fc' },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    marginLeft: -6,
  },
  backText: { color: BLUE, fontSize: 18 },
  title: {
    color: INK,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 16,
  },
  card: {
    ...shadow,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    borderRadius: 16,
  },
  cardLabel: {
    color: INK,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  divider: { height: 1, backgroundColor: '#e3e9f3' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  flip: { transform: [{ rotate: '180deg' }] },
  option: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eef2f8',
  },
  optionText: { color: colors.muted, fontSize: 16 },
  value: { flexShrink: 1, color: INK, fontSize: 16 },
  placeholder: { flex: 1, color: '#7d8aa3' },
  label: {
    color: INK,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  indented: { marginLeft: 16 },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2f6ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 120,
    padding: 14,
    color: INK,
    fontSize: 16,
  },
  error: { color: colors.error, fontSize: 14, marginTop: 6 },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 10,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
  },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f3f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 56,
    marginTop: 22,
    borderRadius: 999,
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  submitText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  done: { alignItems: 'center', gap: 8, paddingTop: 24 },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e2f6ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doneTitle: { color: INK, fontSize: 22, fontWeight: '800' },
  reference: { color: BLUE, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  doneCopy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  doneButton: { alignSelf: 'stretch' },
  backdrop: { flex: 1, backgroundColor: 'rgba(8, 19, 50, 0.4)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  sheetTitle: { color: INK, fontSize: 19, fontWeight: '700', marginBottom: 8 },
  sheetList: { flexGrow: 0 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f8',
  },
  sheetMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
