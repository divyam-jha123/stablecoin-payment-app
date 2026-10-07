import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './payment-ui';
import { homeTheme as theme } from '../theme/home';

// Reuse the supplied photo without modifying the reference asset. The preview
// viewport clips its 30px photo region at (44, 70) in the 356×733 screenshot.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const profileReference = require('../../../../assets/home-design-reference.png');
const photoScale = theme.layout.avatar / 30;

export function HomeGreeting({
  name,
  showMockPhoto = false,
  unread = false,
  onProfile,
  onNotifications,
}: {
  name: string;
  showMockPhoto?: boolean;
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
        <View style={styles.avatar}>
          {showMockPhoto ? (
            <Image
              source={profileReference}
              style={styles.photo}
              accessible={false}
            />
          ) : (
            <AppIcon name="person" color={theme.colors.primary} size={24} />
          )}
        </View>
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.greeting}>Hi, {name} 👋</Text>
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
  avatar: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    position: 'absolute',
    width: 356 * photoScale,
    height: 733 * photoScale,
    left: -44 * photoScale,
    top: -70 * photoScale,
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
