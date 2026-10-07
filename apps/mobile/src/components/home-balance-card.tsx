import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppIcon } from './payment-ui';
import { homeTheme as theme } from '../theme/home';

export type HomePaymentActions = {
  onAddMoney: () => void;
  onSend: () => void;
  onReceive: () => void;
  disabled?: boolean;
  fundingDisabled?: boolean;
  fundingLabel?: string;
};

export function HomeBalanceCard({
  balance,
  equivalent,
  currency,
  visible,
  onToggleVisibility,
  onCurrencyPress,
  onActivity,
  monthlyChange,
  onAddMoney,
  onSend,
  onReceive,
  disabled = false,
  fundingDisabled = false,
  fundingLabel = 'Add Money',
}: HomePaymentActions & {
  balance: string;
  equivalent: string;
  currency: string;
  visible: boolean;
  onToggleVisibility: () => void;
  onCurrencyPress: () => void;
  onActivity: () => void;
  monthlyChange?: string | undefined;
}) {
  const actions = [
    {
      label: fundingLabel,
      icon: 'plus',
      onPress: onAddMoney,
      disabled: disabled || fundingDisabled,
    },
    { label: 'Send', icon: 'arrow-up-right', onPress: onSend, disabled },
    { label: 'Receive', icon: 'receive', onPress: onReceive, disabled },
  ] as const;
  return (
    <View style={styles.card}>
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <LinearGradient id="homeBalance" x1="0" y1="0" x2="0.25" y2="1">
            <Stop offset="0" stopColor={theme.colors.balanceTop} />
            <Stop offset="1" stopColor={theme.colors.balanceBottom} />
          </LinearGradient>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          rx={theme.radius.surface}
          fill="url(#homeBalance)"
        />
      </Svg>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Text style={styles.label}>Total Balance</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide balance' : 'Show balance'}
            onPress={onToggleVisibility}
            style={styles.iconTarget}
          >
            <View style={styles.eyeCircle}>
              <AppIcon
                name={visible ? 'eye-off' : 'eye'}
                size={16}
                color={theme.colors.onBalance}
              />
            </View>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select currency, ${currency} selected`}
          onPress={onCurrencyPress}
          style={styles.currencyTarget}
        >
          <View style={styles.currencyPill}>
            <AppIcon name="currency" color={theme.colors.onBalance} size={22} />
            <Text style={styles.currency}>{currency}</Text>
            <AppIcon
              name="chevron-down"
              color={theme.colors.onBalance}
              size={14}
            />
          </View>
        </Pressable>
      </View>
      <View style={styles.balanceRow}>
        <View style={styles.values}>
          <Text
            style={styles.amount}
            numberOfLines={1}
            adjustsFontSizeToFit
            selectable={visible}
            accessibilityLabel={visible ? undefined : 'Balance hidden'}
            accessibilityLiveRegion="polite"
          >
            {visible ? balance : '••••••••••'}
          </Text>
          <Text
            style={styles.equivalent}
            accessibilityLabel={
              visible ? undefined : 'Converted balance hidden'
            }
          >
            {visible ? equivalent : '≈ ••••••'}
          </Text>
        </View>
        {monthlyChange && (
          <View style={styles.trend}>
            <AppIcon
              name="trend-up"
              size={30}
              color={theme.colors.balanceMuted}
            />
            <View style={styles.changeCopy}>
              <Text style={styles.change}>↑ {monthlyChange}</Text>
              <Text style={styles.month}>This Month</Text>
            </View>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View activity"
          disabled={disabled}
          onPress={onActivity}
          style={[styles.iconTarget, disabled && styles.disabled]}
        >
          <View style={styles.arrowCircle}>
            <AppIcon name="arrow" size={18} color={theme.colors.onBalance} />
          </View>
        </Pressable>
      </View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.icon}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.disabled }}
            disabled={action.disabled}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.action,
              action.disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon
              name={action.icon}
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.surface,
    overflow: 'hidden',
    backgroundColor: theme.colors.balanceBottom,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  label: {
    ...theme.typography.caption,
    color: theme.colors.balanceMuted,
    flexShrink: 1,
  },
  iconTarget: {
    width: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeCircle: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: '#1758ac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyTarget: {
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.balanceOutline,
    borderRadius: theme.radius.pill,
  },
  currency: { fontSize: 11, fontWeight: '600', color: theme.colors.onBalance },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  values: { flex: 1, minWidth: 0 },
  amount: {
    ...theme.typography.amount,
    color: theme.colors.onBalance,
    fontVariant: ['tabular-nums'],
  },
  equivalent: { ...theme.typography.caption, color: theme.colors.balanceMuted },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  changeCopy: { alignItems: 'center', gap: theme.spacing.xs },
  change: {
    color: theme.colors.onBalance,
    backgroundColor: theme.colors.positive,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '700',
  },
  month: { fontSize: 9, color: theme.colors.balanceMuted },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  action: {
    flex: 1,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.actionSurface,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
