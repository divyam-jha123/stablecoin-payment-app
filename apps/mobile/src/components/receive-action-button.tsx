import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, ScanIcon, colors } from './payment-ui';

export function ReceiveActionButton({
  label,
  icon,
  onPress,
  outlined = false,
  disabled = false,
}: {
  label: string;
  icon: 'share' | 'scan';
  onPress: () => void;
  outlined?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        outlined && styles.outlined,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon === 'scan' ? (
          <ScanIcon color={colors.accent} size={22} />
        ) : (
          <AppIcon name="share" color="#ffffff" size={21} />
        )}
        <Text style={[styles.label, outlined && styles.outlinedLabel]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    backgroundColor: colors.accent,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  outlined: {
    backgroundColor: '#ffffff',
    borderColor: colors.accent,
    borderWidth: 1,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  outlinedLabel: { color: colors.accent },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
});
