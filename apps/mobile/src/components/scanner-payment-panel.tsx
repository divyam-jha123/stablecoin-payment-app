import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppIcon, colors } from './payment-ui';
import {
  SCANNER_DEMO_ACCOUNTS,
  type ScannerPaymentAccount,
  type ScannerPaymentBalance,
} from '../features/payment/scanner-accounts';

export interface ScannerPaymentPanelProps {
  selectedAccount: ScannerPaymentAccount;
  balance: ScannerPaymentBalance;
  onSelectAccount: () => void;
  onPay: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function TokenIcon({ account }: { account: ScannerPaymentAccount }) {
  if (account.symbol === 'USDC') {
    return (
      <View style={[styles.tokenIcon, { backgroundColor: '#2775CA' }]}>
        <Svg width={28} height={28} viewBox="0 0 24 24" accessible={false}>
          <Path
            d="M6.5 6.8C4.9 8.3 4 10.5 4 13c0 2.5.9 4.7 2.5 6.2M17.5 6.8c1.6 1.5 2.5 3.7 2.5 6.2 0 2.5-.9 4.7-2.5 6.2"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M12 4.5v15M14.5 9.5c0-1.4-1.1-2-2.5-2h-1c-1.1 0-2 .9-2 2 0 2.2 4.5 1.8 4.5 4 0 1.1-.9 2-2 2h-1.5c-1.4 0-2.5-.9-2.5-2"
            stroke="#ffffff"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
    );
  }
  return (
    <View style={[styles.tokenIcon, { backgroundColor: account.color }]}>
      <Svg width={28} height={28} viewBox="0 0 24 24" accessible={false}>
        <Path
          d={
            account.symbol === 'USDT'
              ? 'M5 5h14M12 5v15M7 9h10M4 11c0 3 16 3 16 0'
              : 'M8 20V4h5a5 5 0 0 1 0 10H8'
          }
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function ScannerPaymentPanel({
  selectedAccount,
  balance,
  onSelectAccount,
  onPay,
  disabled = false,
  loading = false,
}: ScannerPaymentPanelProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.panel,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          paddingLeft: 24 + insets.left,
          paddingRight: 24 + insets.right,
        },
      ]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.heading}>Pay from</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change payment token"
          disabled={loading}
          onPress={onSelectAccount}
          style={({ pressed }) => [styles.change, pressed && styles.pressed]}
        >
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${selectedAccount.symbol}, balance ${balance.inr} rupees, approximately ${balance.tokens} ${selectedAccount.symbol}. Change payment token`}
        disabled={loading}
        onPress={onSelectAccount}
        style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}
      >
        <TokenIcon account={selectedAccount} />
        <View style={styles.accountCopy}>
          <Text style={styles.symbol}>{selectedAccount.symbol}</Text>
          <Text style={styles.inrBalance}>₹ {balance.inr}</Text>
          <Text style={styles.tokenBalance}>
            ≈ {balance.tokens} {selectedAccount.symbol}
          </Text>
        </View>
        <View style={styles.chevron}>
          <AppIcon name="chevron-down" size={18} color="#005ae1" />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Reading payment QR' : 'Pay'}
        accessibilityHint={
          disabled
            ? 'Scan a valid payment QR to continue'
            : 'Review the scanned payment'
        }
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPress={onPay}
        style={({ pressed }) => [
          styles.payTarget,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.payButton}>
          {loading ? <ActivityIndicator color="#ffffff" size="small" /> : null}
          <Text style={styles.payText}>Pay</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function ScannerTokenSelectionSheet({
  visible,
  selectedAccount,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedAccount: ScannerPaymentAccount;
  onSelect: (account: ScannerPaymentAccount) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close token selection"
          accessibilityRole="button"
        />
        <View
          style={[
            styles.selectionSheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              marginTop: insets.top + 16,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.selectionTitle}>
            Payment token
          </Text>
          <Text style={styles.selectionHint}>
            Demo balances for this hackathon. No real funds move.
          </Text>
          <ScrollView contentContainerStyle={styles.tokenList}>
            {SCANNER_DEMO_ACCOUNTS.map(({ account, balance }) => (
              <Pressable
                key={account.symbol}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selectedAccount.symbol === account.symbol,
                }}
                onPress={() => onSelect(account)}
                style={({ pressed }) => [
                  styles.tokenOption,
                  selectedAccount.symbol === account.symbol &&
                    styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <TokenIcon account={account} />
                <View style={styles.accountCopy}>
                  <Text style={styles.symbol}>{account.symbol}</Text>
                  <Text style={styles.tokenBalance}>
                    {account.name} · {balance.tokens}
                  </Text>
                </View>
                <Text style={styles.optionAmount}>₹ {balance.inr}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancel}
          >
            <Text style={styles.changeText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#d3d7df',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  headingGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  demoLabel: { color: colors.muted, fontSize: 12 },
  change: {
    minHeight: 48,
    minWidth: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  changeText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    padding: 16,
  },
  tokenIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: { flex: 1, gap: 3 },
  symbol: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  balanceLabel: { color: colors.muted, fontSize: 11, lineHeight: 14 },
  inrBalance: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tokenBalance: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#edf0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTarget: { minHeight: 48, justifyContent: 'center', marginTop: 14 },
  payButton: {
    backgroundColor: colors.accent,
    minHeight: 44,
    borderRadius: 24,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 19, 50, 0.45)',
  },
  selectionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 26,
    paddingTop: 12,
    maxHeight: '85%',
  },
  selectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 14,
  },
  selectionHint: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginTop: 8,
  },
  tokenList: { gap: 10, paddingVertical: 20 },
  tokenOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selectedOption: { borderColor: colors.accent, backgroundColor: '#edf5ff' },
  optionAmount: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
