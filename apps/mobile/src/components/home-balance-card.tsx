import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { AppIcon } from './payment-ui';
import { MetaMaskLogo } from './payment-logos';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

export type HomePaymentActions = {
  onAddMoney: () => void;
  onSend: () => void;
  onReceive: () => void;
  disabled?: boolean;
  fundingDisabled?: boolean;
  fundingLabel?: string;
};

function Bolt() {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M13 2 3 14h9l-1 8 10-12h-9z"
        fill={tc(theme.colors.gasless, 'auto')}
      />
    </Svg>
  );
}

export function HomeBalanceCard({
  balance,
  equivalent,
  currency,
  visible,
  gasless,
  onToggleVisibility,
  onCurrencyPress,
  monthlyChange,
  onWallet,
}: {
  balance: string;
  equivalent: string;
  currency: string;
  visible: boolean;
  gasless: boolean;
  onToggleVisibility: () => void;
  onCurrencyPress: () => void;
  /** Set only for a signed-in MetaMask wallet; shows the connected pill. */
  onWallet?: (() => void) | undefined;
  /** Undefined until a live source exists; the card then shows a dash. */
  monthlyChange?: string | undefined;
}) {
  // Percentage sizes can miss the card's final height, leaving a hard edge.
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View
      style={styles.card}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize({ width: layout.width, height: layout.height })
      }
    >
      <Svg
        width={size.width}
        height={size.height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <LinearGradient id="homeBalance" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tc(theme.colors.balanceTop, 'bg')} />
            <Stop
              offset="0.6"
              stopColor={tc(theme.colors.balanceMiddle, 'bg')}
            />
            <Stop offset="1" stopColor={tc(theme.colors.balanceBottom, 'bg')} />
          </LinearGradient>
        </Defs>
        <Rect
          width={size.width}
          height={size.height}
          rx={theme.radius.surface}
          fill="url(#homeBalance)"
        />
      </Svg>
      <View style={styles.values}>
        <View style={styles.titleRow}>
          <Text style={styles.label} numberOfLines={1}>
            Total Spending Power
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide balance' : 'Show balance'}
            onPress={onToggleVisibility}
            hitSlop={12}
            style={styles.eyeCircle}
          >
            <AppIcon
              name={visible ? 'eye' : 'eye-off'}
              size={16}
              color={tc(theme.colors.onBalance)}
            />
          </Pressable>
        </View>
        <Text
          style={styles.amount}
          numberOfLines={1}
          adjustsFontSizeToFit
          selectable={visible}
          accessibilityLabel={visible ? undefined : 'Balance hidden'}
          accessibilityLiveRegion="polite"
        >
          {visible ? balance : '••••••'}
        </Text>
        <Text
          style={styles.equivalent}
          numberOfLines={1}
          accessibilityLabel={visible ? undefined : 'Converted balance hidden'}
        >
          {visible ? equivalent : '≈ ••••••'}
        </Text>
        {onWallet && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="MetaMask connected. View wallet in Profile."
            onPress={onWallet}
            hitSlop={6}
            style={({ pressed }) => [
              styles.walletPill,
              pressed && styles.pressed,
            ]}
          >
            <MetaMaskLogo size={18} />
            <Text style={styles.walletText} numberOfLines={1}>
              MetaMask Connected
            </Text>
            <AppIcon
              name="chevron-right"
              size={14}
              color={tc(theme.colors.onBalance)}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.side}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select currency, ${currency} selected`}
          onPress={onCurrencyPress}
          hitSlop={8}
          style={styles.currencyPill}
        >
          <AppIcon
            name="currency"
            color={tc(theme.colors.onBalance)}
            size={20}
          />
          <Text style={styles.currency}>{currency}</Text>
          <AppIcon
            name="chevron-down"
            color={tc(theme.colors.onBalance)}
            size={14}
          />
        </Pressable>
        {gasless && (
          <View style={styles.gaslessChip}>
            <Bolt />
            <Text style={styles.gaslessText} numberOfLines={1}>
              Gasless Active
            </Text>
          </View>
        )}
        <View
          style={styles.trend}
          accessible
          accessibilityLabel={
            monthlyChange
              ? `Up ${monthlyChange} this month`
              : 'Monthly change not available yet'
          }
        >
          <View style={styles.changeRow}>
            {monthlyChange && (
              <AppIcon
                name="trend-up"
                size={16}
                color={tc(theme.colors.positiveOnBalance)}
              />
            )}
            <Text style={styles.change}>
              {monthlyChange ? `+${monthlyChange}` : '—'}
            </Text>
          </View>
          <Text style={styles.month} numberOfLines={1}>
            This Month
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = themedStyleSheet({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.surface,
    overflow: 'hidden',
    backgroundColor: theme.colors.balanceBottom,
    padding: theme.spacing.lg,
  },
  values: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.balanceMuted,
    flexShrink: 1,
  },
  eyeCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    color: theme.colors.onBalance,
    fontVariant: ['tabular-nums'],
    marginTop: theme.spacing.xs,
  },
  equivalent: {
    ...theme.typography.body,
    color: theme.colors.balanceMuted,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: theme.spacing.md,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  walletText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onBalance,
    flexShrink: 1,
  },
  side: { flexShrink: 0, alignItems: 'flex-end', gap: theme.spacing.sm },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.balanceOutline,
    borderRadius: theme.radius.pill,
  },
  currency: { fontSize: 13, fontWeight: '600', color: theme.colors.onBalance },
  gaslessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  gaslessText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onBalance,
  },
  trend: { alignItems: 'flex-end' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  change: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.positiveOnBalance,
  },
  month: { fontSize: 12, color: theme.colors.balanceMuted },
  pressed: { opacity: 0.7 },
});
