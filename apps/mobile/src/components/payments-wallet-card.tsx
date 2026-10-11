import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { AppIcon, ScanIcon } from './payment-ui';
import { TokenEmblem } from './payment-logos';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

const CARD_TOP = '#16326e';
const CARD_MIDDLE = '#0c2257';
const CARD_BOTTOM = '#081640';
const GASLESS_TEXT = '#7ee2a2';

function Bolt() {
  return (
    <Svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M13 2 3 14h9l-1 8 10-12h-9z" fill={tc(GASLESS_TEXT, 'auto')} />
    </Svg>
  );
}

/** Navy wallet card on Payments: selected token, balance and Scan & Pay. */
export function PaymentsWalletCard({
  balance,
  equivalent,
  token,
  gasless,
  disabled = false,
  onTokenPress,
  onScanPay,
}: {
  balance: string;
  equivalent: string;
  token: string;
  gasless: boolean;
  disabled?: boolean;
  onTokenPress: () => void;
  onScanPay: () => void;
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
          <LinearGradient id="paymentsWallet" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tc(CARD_TOP, 'bg')} />
            <Stop offset="0.55" stopColor={tc(CARD_MIDDLE, 'bg')} />
            <Stop offset="1" stopColor={tc(CARD_BOTTOM, 'bg')} />
          </LinearGradient>
        </Defs>
        <Rect
          width={size.width}
          height={size.height}
          rx={theme.radius.surface + 4}
          fill="url(#paymentsWallet)"
        />
      </Svg>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          Your payment wallet
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select token, ${token} selected`}
          onPress={onTokenPress}
          hitSlop={8}
          style={styles.tokenPill}
        >
          <TokenEmblem symbol={token} size={20} />
          <Text style={styles.token}>{token}</Text>
          <AppIcon
            name="chevron-down"
            color={tc(theme.colors.onBalance)}
            size={14}
          />
        </Pressable>
      </View>
      <View style={styles.headlineRow}>
        <View style={styles.headlineCopy}>
          <Text accessibilityRole="header" style={styles.headline}>
            Ready to pay?
          </Text>
          <Text style={styles.tagline}>Fast. Simple. Travel-ready.</Text>
        </View>
        <AppIcon
          name="wallet"
          color={tc(theme.colors.balanceMuted)}
          size={30}
        />
      </View>
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLiveRegion="polite"
      >
        {balance}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.equivalent} numberOfLines={1}>
          {equivalent}
        </Text>
        {gasless && (
          <View style={styles.gaslessChip}>
            <Bolt />
            <Text style={styles.gaslessText}>Gasless</Text>
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan and pay"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onScanPay}
        style={({ pressed }) => [
          styles.scanButton,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ScanIcon color={tc(theme.colors.primary)} size={22} />
        <Text style={styles.scanText}>Scan & Pay</Text>
      </Pressable>
    </View>
  );
}

const styles = themedStyleSheet({
  card: {
    borderRadius: theme.radius.surface + 4,
    overflow: 'hidden',
    backgroundColor: CARD_BOTTOM,
    padding: theme.spacing.lg + 4,
    gap: theme.spacing.xs,
    shadowColor: CARD_BOTTOM,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.balanceMuted,
    flexShrink: 1,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  token: { fontSize: 14, fontWeight: '600', color: theme.colors.onBalance },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headlineCopy: { flex: 1, minWidth: 0, gap: 2 },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: theme.colors.onBalance,
  },
  tagline: { ...theme.typography.body, color: theme.colors.balanceMuted },
  amount: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: theme.colors.onBalance,
    fontVariant: ['tabular-nums'],
    marginTop: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  equivalent: {
    ...theme.typography.caption,
    color: theme.colors.balanceMuted,
    flexShrink: 1,
  },
  gaslessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(76,212,127,0.18)',
  },
  gaslessText: { fontSize: 12, fontWeight: '600', color: GASLESS_TEXT },
  scanButton: {
    marginTop: theme.spacing.md,
    minHeight: 52,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  scanText: { fontSize: 18, fontWeight: '600', color: theme.colors.primary },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
