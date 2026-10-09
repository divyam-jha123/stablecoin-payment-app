import { useEffect, useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../src/components/payment-ui';
import {
  activityOverview,
  clockTime,
  groupByDay,
  KIND_LABELS,
  relativeTime,
  type LoginActivityKind,
} from '../src/features/account/login-activity';
import { useLoginActivity } from '../src/features/account/login-activity-store';
import { pinStore } from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';
import { useAccount } from '../src/features/account/use-account';

const BLUE = '#2f6bff';
const INK = '#081332';

// Outline icons on a 24px grid.
const ICONS = {
  back: 'M15 6l-6 6 6 6',
  phone:
    'M8 2.5h8a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 19V5A2.5 2.5 0 0 1 8 2.5z M10.5 5.5h3',
  wallet:
    'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3 M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5z M16 14h.01',
  unlock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2 M12 15v2.5',
  pin: 'M5 5h14v14H5z M9 9.5h.01 M12 9.5h.01 M15 9.5h.01 M9 13h.01 M12 13h.01 M15 13h.01 M12 16.5h.01',
  signOut: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4 M9 16l-4-4 4-4 M5 12h11',
  alert: 'M12 3 2.5 20h19z M12 10v4.5 M12 17.5h.01',
  lock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  empty: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5V12l3 2',
} as const;

const KIND_STYLE: Record<
  LoginActivityKind,
  { icon: string; tint: string; background: string }
> = {
  'sign-in': { icon: ICONS.wallet, tint: BLUE, background: '#e3edff' },
  unlock: { icon: ICONS.unlock, tint: '#1f9d55', background: '#dcf5e6' },
  'pin-set': { icon: ICONS.pin, tint: '#5b3fd6', background: '#ebe5ff' },
  'pin-changed': { icon: ICONS.pin, tint: '#5b3fd6', background: '#ebe5ff' },
  'sign-out': { icon: ICONS.signOut, tint: '#e5484d', background: '#fde3e3' },
};

const FILTERS: { label: string; kinds: readonly LoginActivityKind[] | null }[] =
  [
    { label: 'All', kinds: null },
    { label: 'Sign-ins', kinds: ['sign-in', 'sign-out'] },
    { label: 'Unlocks', kinds: ['unlock'] },
    { label: 'PIN', kinds: ['pin-set', 'pin-changed'] },
  ];

function Glyph({
  d,
  color,
  size = 24,
  strokeWidth = 2,
}: {
  d: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Fades and rises into place, one after another. */
function Reveal({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay: 40 + index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, index]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function Stat({
  value,
  label,
  tint,
}: {
  value: string;
  label: string;
  tint: string;
}) {
  return (
    <View style={styles.stat}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.statValue, { color: tint }]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function LoginActivity() {
  const { wallet } = useAccount();
  const { device, entries } = useLoginActivity(wallet.account?.address);
  const [filter, setFilter] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Keep "2 minutes ago" current while the screen is open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const latest = entries[0];
  const kinds = FILTERS[filter]!.kinds;
  const shown = kinds
    ? entries.filter((entry) => kinds.includes(entry.kind))
    : entries;
  const groups = groupByDay(shown, now);
  const overview = activityOverview(entries, now);

  async function changePin() {
    const owner = pinOwner();
    if (!owner) {
      Alert.alert(
        'Transaction PIN',
        'Connect your wallet to set a payment PIN.',
      );
      return;
    }
    const hasPin = await pinStore.hasPin(owner).catch(() => false);
    router.push(
      hasPin
        ? {
            pathname: '/pin-entry',
            params: { mode: 'change', next: 'profile' },
          }
        : { pathname: '/pin-setup', params: { next: 'profile' } },
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/security')
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Glyph d={ICONS.back} color={INK} size={22} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Login Activity
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Reveal index={0}>
          <Text style={styles.sectionLabel}>THIS DEVICE</Text>
          <View
            accessible
            accessibilityLabel={`${device.name}, current device, ${device.detail}`}
            style={styles.deviceCard}
          >
            <View style={styles.deviceIcon}>
              <Glyph d={ICONS.phone} color={INK} size={40} strokeWidth={1.8} />
            </View>
            <View style={styles.deviceCopy}>
              <Text numberOfLines={1} style={styles.deviceName}>
                {device.name}
              </Text>
              <Text numberOfLines={1} style={styles.deviceDetail}>
                {device.detail} ·{' '}
                {latest ? relativeTime(latest.at, now) : 'Active now'}
              </Text>
            </View>
            <View style={styles.currentPill}>
              <View style={styles.liveDot} />
              <Text style={styles.currentText}>Current</Text>
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <View style={styles.stats}>
            <Stat
              value={String(overview.signIns)}
              label={'Sign-ins\nlast 30 days'}
              tint={BLUE}
            />
            <Stat
              value={String(overview.unlocks)}
              label={'Unlocks\nlast 30 days'}
              tint="#1f9d55"
            />
            <Stat
              value={
                overview.lastPinChange === null
                  ? 'Never'
                  : relativeTime(overview.lastPinChange, now)
              }
              label={'Last PIN\nchange'}
              tint="#5b3fd6"
            />
          </View>
        </Reveal>

        <Reveal index={2}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {FILTERS.map((item, index) => {
              const selected = index === filter;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(index)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextOn]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Reveal>

        <Reveal index={3}>
          {groups.length ? (
            <View style={styles.timeline}>
              {groups.map((group) => (
                <View key={group.label} style={styles.group}>
                  <Text style={styles.dayLabel}>{group.label}</Text>
                  <View style={styles.panel}>
                    {group.entries.map((entry, index) => {
                      const look = KIND_STYLE[entry.kind];
                      return (
                        <View
                          key={entry.id}
                          accessible
                          accessibilityLabel={`${KIND_LABELS[entry.kind]}, ${entry.device}, ${entry.detail}, ${clockTime(entry.at)}`}
                          style={[
                            styles.entry,
                            index > 0 && styles.entryDivider,
                          ]}
                        >
                          <View
                            style={[
                              styles.entryIcon,
                              { backgroundColor: look.background },
                            ]}
                          >
                            <Glyph d={look.icon} color={look.tint} size={20} />
                          </View>
                          <View style={styles.entryCopy}>
                            <Text style={styles.entryTitle}>
                              {KIND_LABELS[entry.kind]}
                            </Text>
                            <Text numberOfLines={1} style={styles.entryDetail}>
                              {entry.device} · {entry.detail}
                            </Text>
                          </View>
                          <Text style={styles.entryTime}>
                            {clockTime(entry.at)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Glyph d={ICONS.empty} color={BLUE} size={28} />
              </View>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>
                Sign-ins, unlocks and PIN changes on this phone will show here.
              </Text>
            </View>
          )}
        </Reveal>

        <Reveal index={4}>
          <View style={styles.alertCard}>
            <View style={styles.alertHead}>
              <View style={styles.alertIcon}>
                <Glyph d={ICONS.alert} color="#b45309" size={20} />
              </View>
              <View style={styles.entryCopy}>
                <Text style={styles.alertTitle}>
                  Don’t recognise this activity?
                </Text>
                <Text style={styles.alertText}>
                  Change your Transaction PIN now, then disconnect your wallet
                  from Profile.
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void changePin()}
              style={({ pressed }) => [
                styles.alertButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.alertButtonText}>Change Transaction PIN</Text>
            </Pressable>
          </View>
        </Reveal>

        <View style={styles.footer}>
          <Glyph d={ICONS.lock} color={colors.muted} size={14} />
          <Text style={styles.footerText}>
            Activity is kept on this phone only and never shared.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#000000', fontSize: 24, fontWeight: '800' },
  headerSpacer: { width: 46 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 18,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  sectionLabel: {
    color: '#6b7a96',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f7f8fa',
  },
  deviceIcon: { width: 48, alignItems: 'center' },
  deviceCopy: { flex: 1, gap: 4 },
  deviceName: { color: '#000000', fontSize: 19, fontWeight: '500' },
  deviceDetail: { color: '#66738c', fontSize: 14, fontWeight: '600' },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#d6e6fd',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22a35a',
  },
  currentText: { color: '#1f5ae0', fontSize: 15, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8eef8',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  filters: { gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f4fa',
    borderWidth: 1,
    borderColor: '#e3e9f3',
  },
  chipSelected: { backgroundColor: BLUE, borderColor: BLUE },
  chipText: { color: INK, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: '#ffffff' },
  timeline: { gap: 16 },
  group: { gap: 8 },
  dayLabel: {
    color: INK,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e8eef8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  entryDivider: { borderTopWidth: 1, borderTopColor: '#eef2f8' },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCopy: { flex: 1, gap: 2 },
  entryTitle: { color: INK, fontSize: 15.5, fontWeight: '600' },
  entryDetail: { color: colors.muted, fontSize: 13 },
  entryTime: { color: '#66738c', fontSize: 13, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#f7f8fa',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e3edff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: INK, fontSize: 17, fontWeight: '700' },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  alertCard: {
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f6dcae',
    backgroundColor: '#fff8ec',
  },
  alertHead: { flexDirection: 'row', gap: 12 },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fde9c4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { color: INK, fontSize: 16, fontWeight: '700' },
  alertText: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  alertButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: { color: colors.muted, fontSize: 12.5 },
});
