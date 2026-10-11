import { Pressable, Text, View } from 'react-native';
import { AppIcon } from './payment-ui';
import { previewInr } from '../preview-data';
import type { TransactionItem } from '../features/payment/simulated-payments';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

/** Compact payment row for the Payments tab: icon, name, day and amount. */
export function PaymentRow({
  transaction,
  onPress,
}: {
  transaction: TransactionItem;
  onPress?: (() => void) | undefined;
}) {
  const received = transaction.direction === 'Received';
  const day = transaction.time.split(' · ')[0] ?? transaction.time;
  const amount = previewInr(transaction.amount);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${transaction.name}, ${day}, ${transaction.category}, ${received ? 'received' : 'paid'} ${amount}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <AppIcon
          name={received ? 'download' : 'store'}
          color={tc(theme.colors.primary)}
          size={22}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {transaction.name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {day} • {transaction.category}
        </Text>
      </View>
      <Text style={[styles.amount, received && styles.received]}>
        {received ? '+' : '-'}
        {amount}
      </Text>
    </Pressable>
  );
}

const styles = themedStyleSheet({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 72,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.7 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: '#e3efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  detail: { ...theme.typography.caption, color: theme.colors.muted },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  received: { color: theme.colors.positive },
});
