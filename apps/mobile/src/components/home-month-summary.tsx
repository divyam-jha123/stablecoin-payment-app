import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppIcon } from './payment-ui';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

function ChartBadge() {
  const bars = [
    { x: 9, height: 14 },
    { x: 17, height: 24 },
    { x: 25, height: 18 },
  ];
  return (
    <View style={styles.badge}>
      <Svg
        width={40}
        height={40}
        viewBox="0 0 40 40"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <LinearGradient id="monthBars" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tc('#4d9bff')} />
            <Stop offset="1" stopColor={tc(theme.colors.primary)} />
          </LinearGradient>
        </Defs>
        {bars.map((bar) => (
          <Rect
            key={bar.x}
            x={bar.x}
            y={31 - bar.height}
            width={6}
            height={bar.height}
            rx={3}
            fill="url(#monthBars)"
          />
        ))}
      </Svg>
    </View>
  );
}

/** Home summary of this month's spending, payments and network fees. */
export function HomeMonthSummary({
  spent,
  payments,
  fees,
  saved,
  onPress,
}: {
  spent: string;
  payments: number;
  /** Network fees with their token, or a dash when not tracked yet. */
  fees: string;
  /** INR saved by gasless payments; undefined shows a dash. */
  saved?: string | undefined;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`This month: ${spent} spent, ${payments} payments, network fees ${fees}${saved ? `, ${saved} saved` : ''}. View activity.`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <ChartBadge />
      <Text style={styles.title}>{'This\nMonth'}</Text>
      <View style={[styles.metric, styles.divided]}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {spent}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          Spent
        </Text>
      </View>
      <View style={[styles.metric, styles.divided, styles.narrow]}>
        <Text style={styles.value} numberOfLines={1}>
          {payments}
        </Text>
        <Text
          style={styles.label}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          Payments
        </Text>
      </View>
      <View style={[styles.metric, styles.divided, styles.wide]}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {fees}
        </Text>
        <Text
          style={[styles.label, saved ? styles.saved : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {saved ? `+ ${saved} Saved` : '— Saved'}
        </Text>
      </View>
      <AppIcon name="chevron-right" size={18} color={tc(theme.colors.muted)} />
    </Pressable>
  );
}

const styles = themedStyleSheet({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 72,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: '#e3eaf5',
    backgroundColor: '#ffffff',
    shadowColor: '#001c57',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e6f0ff',
    overflow: 'hidden',
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  metric: { flex: 1.15, minWidth: 0, gap: 2 },
  narrow: { flex: 1.05 },
  wide: { flex: 1.5 },
  divided: {
    borderLeftWidth: 1,
    borderLeftColor: '#e3eaf5',
    paddingLeft: theme.spacing.sm,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  label: { fontSize: 11, color: theme.colors.muted },
  saved: { color: '#16a34a', fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
