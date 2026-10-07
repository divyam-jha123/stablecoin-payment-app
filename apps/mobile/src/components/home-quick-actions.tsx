import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, ScanIcon } from './payment-ui';
import type { HomePaymentActions } from './home-balance-card';
import { homeTheme as theme } from '../theme/home';

export function HomeQuickActions({
  onScan,
  onAddMoney,
  onSend,
  onReceive,
  disabled = false,
  fundingDisabled = false,
  fundingLabel = 'Add Money',
  fundingHint = 'From bank',
}: HomePaymentActions & { onScan: () => void; fundingHint?: string }) {
  const actions = [
    {
      title: 'Scan & Pay',
      hint: 'Pay anywhere',
      icon: null,
      onPress: onScan,
      disabled,
    },
    {
      title: 'Send',
      hint: 'To contacts',
      icon: 'send',
      onPress: onSend,
      disabled,
    },
    {
      title: 'Receive',
      hint: 'Get paid',
      icon: 'person',
      onPress: onReceive,
      disabled,
    },
    {
      title: fundingLabel,
      hint: fundingHint,
      icon: 'wallet',
      onPress: onAddMoney,
      disabled: disabled || fundingDisabled,
    },
  ] as const;
  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <Pressable
          key={action.hint}
          accessibilityRole="button"
          accessibilityLabel={`${action.title}, ${action.hint}`}
          accessibilityState={{ disabled: action.disabled }}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            action.disabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {index > 0 && <View style={styles.separator} />}
          <View style={[styles.circle, !action.icon && styles.primaryCircle]}>
            {action.icon ? (
              <AppIcon
                name={action.icon}
                color={theme.colors.primary}
                size={25}
              />
            ) : (
              <ScanIcon color={theme.colors.onBalance} size={25} />
            )}
          </View>
          <Text style={styles.title}>{action.title}</Text>
          <Text style={styles.hint}>{action.hint}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.surface,
    paddingVertical: theme.spacing.md,
  },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  separator: {
    position: 'absolute',
    left: 0,
    top: theme.spacing.xs,
    bottom: theme.spacing.lg,
    width: 1,
    backgroundColor: theme.colors.border,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.actionSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  primaryCircle: { backgroundColor: theme.colors.primary },
  title: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: 9,
    lineHeight: 13,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
