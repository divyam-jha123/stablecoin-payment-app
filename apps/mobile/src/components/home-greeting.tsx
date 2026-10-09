import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './payment-ui';
import { ProfileAvatar } from './profile-avatar';
import { homeTheme as theme } from '../theme/home';

export function HomeGreeting({
  name,
  photoUri,
  unread = false,
  onProfile,
  onNotifications,
}: {
  name: string;
  photoUri: string | null;
  unread?: boolean;
  onProfile: () => void;
  onNotifications: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={onProfile}
        style={({ pressed }) => [
          styles.profileButton,
          pressed && styles.pressed,
        ]}
      >
        <ProfileAvatar name={name} photoUri={photoUri} size={36} />
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.greeting}>
          Hi, {name.trim().split(/\s+/u)[0] || 'Traveller'} 👋
        </Text>
        <Text style={styles.subtitle}>Good to see you back!</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread ? 'Notifications, unread updates' : 'Notifications'
        }
        onPress={onNotifications}
        style={({ pressed }) => [
          styles.notificationButton,
          pressed && styles.pressed,
        ]}
      >
        <View>
          <AppIcon name="bell" color={theme.colors.text} size={23} />
          {unread && <View style={styles.unreadDot} />}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 64,
    paddingVertical: theme.spacing.sm,
  },
  profileButton: {
    minHeight: theme.layout.touchTarget,
    width: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  greeting: { ...theme.typography.greeting, color: theme.colors.text },
  subtitle: { ...theme.typography.caption, color: theme.colors.muted },
  notificationButton: {
    width: theme.layout.touchTarget,
    minHeight: theme.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  unreadDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: theme.radius.pill,
    top: 0,
    right: 1,
    backgroundColor: theme.colors.unread,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  pressed: { opacity: 0.6 },
});
