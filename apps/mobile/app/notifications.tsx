import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors } from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { useNotifications } from '../src/features/notifications/notification-store';
import {
  groupNotifications,
  notificationTime,
  type AppNotification,
  type NotificationKind,
} from '../src/features/notifications/notifications';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const BLUE = '#2f6bff';

// Icon and colours per kind, on a 24px grid.
const KINDS: Record<
  NotificationKind,
  { icon: string; tint: string; background: string }
> = {
  payment: {
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8 12.3l2.7 2.7L16.2 9.5',
    tint: '#1f9d55',
    background: '#e0f5e8',
  },
  offer: {
    icon: 'M4 10h16v3H4z M5.5 13h13v7.5h-13z M12 10v10.5 M12 10S10.5 5 8 5.5 7 9 12 10z M12 10s1.5-5 4-4.5S17 9 12 10z',
    tint: '#d99a06',
    background: '#fdf3d6',
  },
  security: {
    icon: 'M12 2.8 4.8 5.6v5.9c0 4.6 3.1 8.4 7.2 9.7 4.1-1.3 7.2-5.1 7.2-9.7V5.6z M12 8.5v4.2 M12 15.5h.01',
    tint: '#d23c3c',
    background: '#fde6e6',
  },
  received: {
    icon: 'M3.5 7h14.5a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-14z M3.5 7V5.5a2 2 0 0 1 2-2H16 M16.5 13.5h.01',
    tint: '#2563eb',
    background: '#e3edfd',
  },
};

function Glyph({
  d,
  color,
  size = 22,
}: {
  d: string;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={tc(color)}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function NotificationCard({
  item,
  now,
  onPress,
}: {
  item: AppNotification & { unread: boolean };
  now: number;
  onPress: () => void;
}) {
  const kind = KINDS[item.kind];
  const time = notificationTime(item.at, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.unread ? 'Unread. ' : ''}${item.title}. ${item.body} ${time}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View
        style={[styles.icon, { backgroundColor: tc(kind.background, 'bg') }]}
      >
        <Glyph d={kind.icon} color={tc(kind.tint)} size={24} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardBody}>{item.body}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.time}>{time}</Text>
        {item.unread ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
}

export default function Notifications() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const { wallet } = useAccount();
  const { items, unreadCount, markRead } = useNotifications(
    wallet.account?.address,
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const now = Date.now();
  const shown =
    filter === 'unread' ? items.filter((item) => item.unread) : items;
  const groups = groupNotifications(shown, now);

  function open(item: AppNotification) {
    markRead([item.id]);
    const target = item.target;
    if (!target) return;
    if (target.pathname === '/receipt')
      router.push({ pathname: '/receipt', params: { id: target.id } });
    else if (target.pathname === '/activity')
      router.push({ pathname: '/activity', params: { filter: target.filter } });
    else router.push(target.pathname);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/home')
            }
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Glyph d="M15 18l-6-6 6-6" color={tc(BLUE)} size={28} />
          </Pressable>
          {unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => markRead(items.map((item) => item.id))}
            >
              <Text style={styles.markAll}>Mark all as read</Text>
            </Pressable>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Notifications
        </Text>

        <View accessibilityRole="tablist" style={styles.segment}>
          {(['all', 'unread'] as const).map((option) => {
            const active = filter === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option)}
                style={[styles.segmentItem, active && styles.segmentActive]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}
                >
                  {option === 'all'
                    ? 'All'
                    : `Unread${unreadCount ? ` (${unreadCount})` : ''}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {groups.length ? (
          groups.map((group) => (
            <View key={group.day} style={styles.group}>
              <Text style={styles.day}>{group.day}</Text>
              {group.items.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item as AppNotification & { unread: boolean }}
                  now={now}
                  onPress={() => open(item)}
                />
              ))}
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Glyph
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4"
                color={tc(BLUE)}
                size={30}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'unread'
                ? "You're all caught up"
                : 'No notifications yet'}
            </Text>
            <Text style={styles.emptyCopy}>
              {filter === 'unread'
                ? 'New payments and sign-ins will show here.'
                : 'Payments and sign-ins on this phone will show here.'}
            </Text>
          </View>
        )}
      </ScrollView>
      <DashboardNav />
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: '#f2f6fc' },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  back: { width: 44, height: 44, justifyContent: 'center' },
  markAll: { color: BLUE, fontSize: 14, fontWeight: '600' },
  title: {
    color: '#0b0f1f',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 16,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e3e8f0',
    borderRadius: 22,
    padding: 4,
    marginBottom: 8,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: { color: '#6b778c', fontSize: 15, fontWeight: '600' },
  segmentTextActive: { color: '#ffffff' },
  group: { gap: 10, marginTop: 14 },
  day: { color: '#0b0f1f', fontSize: 17, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    shadowColor: '#0b2a6b',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  copy: { flex: 1, gap: 3 },
  cardTitle: { color: '#0b0f1f', fontSize: 16, fontWeight: '700' },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 19 },
  meta: { alignItems: 'flex-end', gap: 10 },
  time: { color: '#7d8aa3', fontSize: 12 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BLUE,
  },
  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#e3edfd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { color: '#0b0f1f', fontSize: 18, fontWeight: '700' },
  emptyCopy: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
