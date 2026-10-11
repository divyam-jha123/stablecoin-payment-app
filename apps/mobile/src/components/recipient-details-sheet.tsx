import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from './bottom-sheet';
import { AppIcon } from './payment-ui';
import { TokenEmblem } from './payment-logos';
import { RecipientAvatar } from './recipient-avatar';
import type {
  SimulatedPayment,
  TransactionItem,
} from '../features/payment/simulated-payments';
import { previewInr } from '../preview-data';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

function dateLabel(createdAt: number) {
  return new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Who a recipient is and what the traveller has paid them, worked out from
 * the payments on this device. Opened from the history screen's header.
 */
export function RecipientDetailsSheet({
  visible,
  name,
  vpa,
  brand,
  history,
  copied,
  onPay,
  onCopyVpa,
  onClose,
}: {
  visible: boolean;
  name: string;
  vpa: string | null;
  brand?: TransactionItem['brand'] | undefined;
  /** This recipient's payments, oldest first. */
  history: readonly SimulatedPayment[];
  copied: boolean;
  onPay: () => void;
  onCopyVpa: () => void;
  onClose: () => void;
}) {
  const total = history.reduce(
    (sum, payment) => sum + Number(payment.inrAmount),
    0,
  );
  const first = history[0];
  const last = history[history.length - 1];
  const tokens = [...new Set(history.map((payment) => payment.token))];
  const rows: { label: string; value: string }[] = [
    { label: 'Total paid', value: previewInr(total) },
    {
      label: 'Payments',
      value: String(history.length),
    },
    { label: 'First payment', value: first ? dateLabel(first.createdAt) : '—' },
    { label: 'Last payment', value: last ? dateLabel(last.createdAt) : '—' },
  ];

  return (
    <BottomSheet
      visible={visible}
      title="Recipient details"
      subtitle="From your payments on this device."
      onClose={onClose}
    >
      <View style={styles.identity}>
        <RecipientAvatar name={name} brand={brand} size={72} />
        <Text style={styles.name} numberOfLines={2}>
          {name || 'Unknown recipient'}
        </Text>
        <View style={styles.vpaRow}>
          <Text style={styles.vpa} numberOfLines={1} selectable>
            {vpa ?? 'UPI ID not saved'}
          </Text>
          {vpa && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copied ? 'UPI ID copied' : 'Copy UPI ID'}
              hitSlop={10}
              onPress={onCopyVpa}
              style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
            >
              <AppIcon
                name={copied ? 'check' : 'copy'}
                size={16}
                color={tc(theme.colors.primary)}
              />
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.list}>
        {rows.map((row, index) => (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}: ${row.value}`}
            style={[styles.row, index > 0 && styles.divider]}
          >
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
        <View
          accessible
          accessibilityLabel={`Paid with: ${tokens.length ? tokens.join(', ') : 'none yet'}`}
          style={[styles.row, styles.divider]}
        >
          <Text style={styles.label}>Paid with</Text>
          {tokens.length ? (
            <View style={styles.tokens}>
              {tokens.map((token) => (
                <View key={token} style={styles.token}>
                  <TokenEmblem symbol={token} size={18} />
                  <Text style={styles.value}>{token}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>—</Text>
          )}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint={
          vpa
            ? `Enter an amount to pay ${vpa}`
            : 'Opens the scanner to scan their QR'
        }
        disabled={!name}
        onPress={onPay}
        style={({ pressed }) => [
          styles.pay,
          !name && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.payText} numberOfLines={1}>
          Pay {name || 'recipient'}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = themedStyleSheet({
  identity: { alignItems: 'center', gap: 6 },
  name: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  vpaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    maxWidth: '100%',
  },
  vpa: { color: theme.colors.muted, fontSize: 14, flexShrink: 1 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
  list: {
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: '#e3eaf5',
    backgroundColor: '#ffffff',
    paddingHorizontal: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    minHeight: 48,
  },
  divider: { borderTopWidth: 1, borderTopColor: '#e3eaf5' },
  label: { color: theme.colors.muted, fontSize: 14 },
  value: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  tokens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    flexShrink: 1,
  },
  token: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pay: {
    minHeight: 54,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  payText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
