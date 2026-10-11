import { Pressable, Text, View } from 'react-native';
import { AppIcon, ScanIcon } from './payment-ui';
import type { HomePaymentActions } from './home-balance-card';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

export function HomeQuickActions({
  onScan,
  onAddMoney,
  onSend,
  onReceive,
  disabled = false,
  fundingDisabled = false,
  fundingLabel = 'Top Up',
}: HomePaymentActions & { onScan: () => void }) {
  const actions = [
    {
      key: 'scan',
      title: 'Scan\nUPI QR',
      icon: null,
      onPress: onScan,
      disabled,
    },
    {
      key: 'send',
      title: 'Pay\nUPI ID',
      icon: 'send',
      onPress: onSend,
      disabled,
    },
    {
      key: 'receive',
      title: 'Receive\nPayout',
      icon: 'download',
      onPress: onReceive,
      disabled,
    },
    {
      key: 'fund',
      title: fundingLabel,
      icon: 'card-plus',
      onPress: onAddMoney,
      disabled: disabled || fundingDisabled,
    },
  ] as const;
  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.title.replace('\n', ' ')}
          accessibilityState={{ disabled: action.disabled }}
          disabled={action.disabled}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            action.disabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.circle, !action.icon && styles.primaryCircle]}>
            {action.icon ? (
              <AppIcon
                name={action.icon}
                color={tc(theme.colors.primary)}
                size={24}
              />
            ) : (
              <ScanIcon color={tc(theme.colors.onBalance)} size={24} />
            )}
          </View>
          <View style={styles.label}>
            <Text style={styles.title} numberOfLines={2}>
              {action.title}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = themedStyleSheet({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    shadowColor: theme.colors.balanceBottom,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.actionSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryCircle: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: {
    minHeight: 34,
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
