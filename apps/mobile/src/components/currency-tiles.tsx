import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from './payment-ui';
import { IndiaFlagEmblem, TokenEmblem } from './payment-logos';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

export type CurrencyHolding = {
  symbol: string;
  /** Amount held, or a dash when there is no live balance. */
  amount: string;
  /** INR value, currency name or a short note. */
  detail: string;
};

/** "Your currencies": one tile per token or currency the traveller holds. */
export function CurrencyTiles({
  holdings,
  onManage,
}: {
  holdings: readonly CurrencyHolding[];
  onManage: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Your currencies
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage currencies"
          onPress={onManage}
          style={styles.manage}
        >
          <Text style={styles.manageText}>Manage</Text>
          <View style={styles.chevron}>
            <AppIcon
              name="chevron-left"
              size={18}
              color={tc(theme.colors.primary)}
            />
          </View>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {holdings.map((holding) => (
          <View
            key={holding.symbol}
            accessible
            accessibilityLabel={`${holding.symbol}, ${holding.amount === '—' ? 'balance not available' : holding.amount}, ${holding.detail}`}
            style={styles.tile}
          >
            {holding.symbol === 'INR' ? (
              <IndiaFlagEmblem size={44} />
            ) : (
              <TokenEmblem symbol={holding.symbol} size={44} />
            )}
            <Text style={styles.symbol}>{holding.symbol}</Text>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
              {holding.amount}
            </Text>
            <Text style={styles.detail} numberOfLines={1} adjustsFontSizeToFit>
              {holding.detail}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = themedStyleSheet({
  section: { gap: theme.spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: theme.layout.touchTarget,
    paddingLeft: theme.spacing.md,
  },
  manageText: { color: theme.colors.primary, fontSize: 15, fontWeight: '600' },
  chevron: { transform: [{ rotate: '180deg' }] },
  row: { gap: theme.spacing.sm },
  tile: {
    width: 112,
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  symbol: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  amount: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  detail: { color: theme.colors.muted, fontSize: 12 },
});
