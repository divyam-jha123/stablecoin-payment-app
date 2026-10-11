import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from './bottom-sheet';
import { AppIcon } from './payment-ui';
import { TokenEmblem } from './payment-logos';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

export type HomeTokenOption = {
  symbol: string;
  name: string;
  /** Token amount, or a dash when there is no live balance. */
  amount: string;
  /** INR value, or a short note when there is none. */
  detail: string;
};

/** Sheet for choosing which token the Home balance card shows. */
export function HomeTokenSheet({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: readonly HomeTokenOption[];
  selected: string;
  onSelect: (symbol: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      visible={visible}
      title="Currency"
      subtitle="Choose which token your balance shows."
      onClose={onClose}
    >
      <View accessibilityRole="radiogroup" style={styles.list}>
        {options.map((option, index) => {
          const checked = option.symbol === selected;
          return (
            <Pressable
              key={option.symbol}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={`${option.symbol}, ${option.name}. ${option.amount}, ${option.detail}`}
              onPress={() => onSelect(option.symbol)}
              style={({ pressed }) => [
                styles.option,
                index > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <TokenEmblem symbol={option.symbol} size={40} />
              <View style={styles.copy}>
                <Text style={styles.symbol}>{option.symbol}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {option.name}
                </Text>
              </View>
              <View style={styles.values}>
                <Text style={styles.amount} numberOfLines={1}>
                  {option.amount}
                </Text>
                <Text style={styles.name} numberOfLines={1}>
                  {option.detail}
                </Text>
              </View>
              <View style={[styles.radio, checked && styles.radioChecked]}>
                {checked && (
                  <AppIcon
                    name="check"
                    size={14}
                    color={tc(theme.colors.onBalance)}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = themedStyleSheet({
  list: {
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: '#e3eaf5',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 64,
    paddingHorizontal: theme.spacing.md,
  },
  divider: { borderTopWidth: 1, borderTopColor: '#e3eaf5' },
  copy: { flex: 1, minWidth: 0 },
  symbol: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  name: { fontSize: 12, color: theme.colors.muted },
  values: { alignItems: 'flex-end', maxWidth: '45%' },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#c5d3ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  pressed: { opacity: 0.7 },
});
