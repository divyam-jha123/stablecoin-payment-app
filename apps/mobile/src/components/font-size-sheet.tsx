import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from './bottom-sheet';
import { Action, AppIcon } from './payment-ui';
import { themeStore } from '../features/appearance/theme-preferences-store';
import {
  FONT_SIZES,
  type FontSize,
} from '../features/appearance/theme-preferences';
import { tc, themedStyleSheet } from '../theme/themed';

const BLUE = '#2f6bff';
const INK = '#081332';

/**
 * Bottom sheet for the app's text size. A choice applies straight away, so
 * the sheet and the screen behind it resize as the user picks.
 */
export function FontSizeSheet({
  visible,
  fontSize,
  onClose,
}: {
  visible: boolean;
  fontSize: FontSize;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      visible={visible}
      title="Font Size"
      subtitle="Text across TravelPe changes to the size you pick."
      onClose={onClose}
    >
      <View accessibilityRole="radiogroup" style={styles.card}>
        {FONT_SIZES.map((option, index) => {
          const selected = option.id === fontSize;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option.label} text`}
              onPress={() => themeStore.update({ fontSize: option.id })}
              style={({ pressed }) => [
                styles.option,
                index > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.sample}>
                {/* Each sample shows its own size, not the current one. */}
                <Text
                  style={[styles.sampleGlyph, { fontSize: 20 * option.scale }]}
                >
                  Aa
                </Text>
              </View>
              <Text style={styles.label}>{option.label}</Text>
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected ? (
                  <AppIcon name="check" size={13} color={tc('#ffffff')} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Action title="Done" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = themedStyleSheet({
  pressed: { opacity: 0.7 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1e8f3',
    backgroundColor: '#f7f9fd',
    paddingHorizontal: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 58,
  },
  divider: { borderTopWidth: 1, borderTopColor: '#e6ebf3' },
  sample: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e6edf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleGlyph: { color: INK, fontWeight: '600' },
  label: { flex: 1, color: INK, fontSize: 17, fontWeight: '700' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#8b97ad',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: BLUE, borderColor: BLUE },
});
