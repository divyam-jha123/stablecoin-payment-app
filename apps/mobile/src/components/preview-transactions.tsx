import { ILLUSTRATIVE_INR_PER_PATH_USD } from '../features/payment/amount';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon, colors } from './payment-ui';
import { previewInr } from '../preview-data';
import type { TransactionItem } from '../features/payment/simulated-payments';

export function PreviewTransactions({
  transactions,
}: {
  transactions: readonly TransactionItem[];
}) {
  return (
    <View style={styles.list}>
      {transactions.map((transaction) => (
        <View key={transaction.id} style={styles.row}>
          <View
            style={[
              styles.icon,
              transaction.direction === 'Received' && styles.receivedIcon,
            ]}
          >
            <AppIcon
              name={transaction.direction === 'Received' ? 'receive' : 'send'}
              color={
                transaction.direction === 'Received' ? '#fff' : colors.accent
              }
              size={20}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.name}>{transaction.name}</Text>
            <Text style={styles.detail}>
              {transaction.category} · {transaction.direction}
            </Text>
            <Text style={styles.detail}>{transaction.time}</Text>
          </View>
          <View style={styles.amountColumn}>
            <Text
              style={[
                styles.amount,
                transaction.direction === 'Received' && styles.receivedAmount,
              ]}
            >
              {transaction.direction === 'Received' ? '+' : '−'}
              {previewInr(transaction.amount)}
            </Text>
            <Text style={styles.detail}>
              {(
                transaction.amount / Number(ILLUSTRATIVE_INR_PER_PATH_USD)
              ).toFixed(2)}{' '}
              pathUSD
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountColumn: { alignItems: 'flex-end', gap: 4, flexShrink: 1 },
  receivedAmount: { color: '#08733f' },
  receivedIcon: { backgroundColor: '#008866' },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 11 },
  amount: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
});
