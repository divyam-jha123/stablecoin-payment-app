import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ILLUSTRATIVE_INR_PER_PATH_USD } from '../features/payment/amount';
import type { TransactionItem } from '../features/payment/simulated-payments';
import { colors } from './payment-ui';

const GREEN = '#2e9a4f';

// Outline icons on a 24px grid, keyed by transaction category.
const CATEGORY_ICONS: Record<string, string> = {
  'Cafe & Beverages':
    'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M8 3.5v2.5 M12 3.5v2.5',
  'Online Shopping':
    'M3 4h2.2l2.3 10.5h10.3L20 7.5H6.2 M8 19.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0 M15 19.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
  'UPI Transfer': 'M3 9l9-5 9 5z M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 21h18',
  Transport:
    'M5 17V12l2-5h10l2 5v5z M5 12h14 M7 17v2.5 M17 17v2.5 M8 14.5h.01 M16 14.5h.01',
  'Food & Dining':
    'M5 3v5a2 2 0 0 0 4 0V3 M7 3v18 M17 21V3c-2.2 1.2-3.2 3.6-3.2 7.5H17',
  Travel: 'M3 13l7-2 4-7h2l-2 7 6 1 1.5-2H23l-1 5-8 1-4 6H8l2-6-7-1z',
  Bills: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h3',
};
const STORE_ICON =
  'M4 9l1.5-5h13L20 9 M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0 M5 11.5V20h14v-8.5 M10 20v-5h4v5';

function Icon({
  d,
  size,
  color,
  strokeWidth = 2,
}: {
  d: string;
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function TransactionAvatar({ transaction }: { transaction: TransactionItem }) {
  if (transaction.direction === 'Received') {
    return (
      <View style={styles.avatar}>
        <Svg width={56} height={56} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="received" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#6fdc7f" />
              <Stop offset="1" stopColor="#1f8a4a" />
            </LinearGradient>
          </Defs>
          <Rect width={56} height={56} rx={28} fill="url(#received)" />
        </Svg>
        <Icon
          d="M7 17 17 7 M9 7h8v8"
          size={30}
          color="#ffffff"
          strokeWidth={2.8}
        />
      </View>
    );
  }
  if (transaction.brand) {
    const { mark, background, color } = transaction.brand;
    return (
      <View style={[styles.avatar, { backgroundColor: background }]}>
        <Text
          numberOfLines={1}
          style={[
            styles.brandMark,
            { color, fontSize: mark.length <= 2 ? 24 : 14 },
          ]}
        >
          {mark}
        </Text>
      </View>
    );
  }
  // Merchants without a known logo show their first letter.
  const initial = Array.from(transaction.name.trim())[0]?.toUpperCase() ?? '';
  return (
    <View style={[styles.avatar, styles.initialAvatar]}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

/** One transaction as a tappable card: logo, category, time and amount. */
export function TransactionCard({
  transaction,
  onPress,
}: {
  transaction: TransactionItem;
  onPress?: () => void;
}) {
  const received = transaction.direction === 'Received';
  const [, time = transaction.time] = transaction.time.split(' · ');
  const inr = transaction.amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const tokenAmount = (
    transaction.amount / Number(ILLUSTRATIVE_INR_PER_PATH_USD)
  ).toFixed(2);
  const token = transaction.token ?? 'USDC';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${transaction.name}, ${transaction.category}, ${received ? 'received' : 'paid'} ${inr} rupees, ${time}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <TransactionAvatar transaction={transaction} />
      <View style={styles.copy}>
        {/* Long names (e.g. "Received from Archita") shrink to fit one line. */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.name}
        >
          {transaction.name}
        </Text>
        <View style={styles.categoryRow}>
          <View style={styles.categoryIcon}>
            <Icon
              d={CATEGORY_ICONS[transaction.category] ?? STORE_ICON}
              size={14}
              color={colors.ink}
              strokeWidth={1.8}
            />
          </View>
          <Text numberOfLines={1} style={styles.category}>
            {transaction.category}
          </Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.amountColumn}>
        <Text style={[styles.amount, received && styles.receivedAmount]}>
          {received ? '+' : '-'} ₹{inr}
        </Text>
        <Text style={styles.tokenAmount}>
          {tokenAmount} {token}
        </Text>
      </View>
      <Icon d="M9 6l6 6-6 6" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#aec4e8',
    backgroundColor: '#fbfcff',
  },
  pressed: { opacity: 0.7 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandMark: { fontWeight: '800', letterSpacing: -0.3 },
  initialAvatar: { backgroundColor: '#e0efff' },
  initial: { color: colors.accent, fontSize: 24, fontWeight: '700' },
  copy: { flex: 1, gap: 3 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  time: { color: colors.muted, fontSize: 12 },
  amountColumn: { alignItems: 'flex-end', gap: 3 },
  amount: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  receivedAmount: { color: GREEN },
  tokenAmount: { color: colors.muted, fontSize: 12 },
});
