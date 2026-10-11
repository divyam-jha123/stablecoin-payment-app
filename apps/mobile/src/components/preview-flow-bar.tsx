import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uiPreviewEnabled } from '../ui-preview';
import { themedStyleSheet } from '../theme/themed';

export type PreviewFlowAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Development-only controls for stepping through a flow by hand in the UI
 * preview, so each screen and state can be reviewed. Renders nothing otherwise.
 */
export function PreviewFlowBar({
  status,
  actions,
}: {
  status?: string;
  actions: readonly PreviewFlowAction[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (!uiPreviewEnabled) return null;
  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="box-none"
      style={styles.overlay}
    >
      {collapsed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show UI preview controls"
          onPress={() => setCollapsed(false)}
          style={styles.pill}
        >
          <Text style={styles.pillText}>Preview ▴</Text>
        </Pressable>
      ) : (
        <View style={styles.bar}>
          <View style={styles.header}>
            <Text style={styles.status} numberOfLines={1}>
              UI preview{status ? ` · ${status}` : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hide UI preview controls"
              hitSlop={8}
              onPress={() => setCollapsed(true)}
            >
              <Text style={styles.hide}>Hide ▾</Text>
            </Pressable>
          </View>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
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
                <Text style={styles.actionText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  bar: {
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 16,
    gap: 8,
    marginBottom: 8,
    marginHorizontal: 12,
    padding: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  status: { color: '#cbd5e1', flexShrink: 1, fontSize: 11, fontWeight: '600' },
  hide: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    borderRadius: 14,
    marginBottom: 8,
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { color: '#111827', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
