import { useCallback, useEffect, useRef, useState } from 'react';
import { router, Stack, useFocusEffect } from 'expo-router';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors } from '../src/components/payment-ui';
import { Toggle } from '../src/components/toggle';
import {
  phoneHasBiometrics,
  phoneHasLock,
} from '../src/features/account/device-lock';
import { pinStore } from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';
import { securitySummary } from '../src/features/account/security-status';
import { previewSecurity } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const BLUE = '#2f6bff';
const INK = '#081332';

// Outline icons on a 24px grid.
const ICONS = {
  back: 'M15 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  faceId:
    'M4 8V6a2 2 0 0 1 2-2h2 M16 4h2a2 2 0 0 1 2 2v2 M20 16v2a2 2 0 0 1-2 2h-2 M8 20H6a2 2 0 0 1-2-2v-2 M9 9.5v1 M15 9.5v1 M12 9.5v3.5h-1 M9.5 16a3.5 3.5 0 0 0 5 0',
  key: 'M14.5 4a5.5 5.5 0 1 1-4.3 8.9L4 19.1V21h3v-2h2v-2h2l1.6-1.6A5.5 5.5 0 0 1 14.5 4z M16.5 8.5h.01',
  list: 'M9 6.5h11 M9 12h11 M9 17.5h11 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01',
  lock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2.5',
  pin: 'M5 5h14v14H5z M9 9.5h.01 M12 9.5h.01 M15 9.5h.01 M9 13h.01 M12 13h.01 M15 13h.01 M12 16.5h.01',
  devices: 'M3.5 5.5h12v9h-12z M1.5 18h16 M17 9h5v11h-5z M19.5 17.5h.01',
} as const;

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
        stroke={tc(color)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Blue shield with a padlock, circled by a thin ring, with two dots. */
function ShieldHero() {
  return (
    <Svg width={190} height={170} viewBox="0 0 190 170">
      <Defs>
        <LinearGradient id="shield" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={tc('#5b92ff', 'bg')} />
          <Stop offset="0.55" stopColor={tc(BLUE, 'bg')} />
          <Stop offset="1" stopColor={tc('#1748c9', 'bg')} />
        </LinearGradient>
        <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={tc('#c5d7fb', 'bg')} stopOpacity={0.4} />
          <Stop offset="1" stopColor={tc('#9fbcf6', 'bg')} />
        </LinearGradient>
      </Defs>
      <Ellipse
        cx={112}
        cy={96}
        rx={78}
        ry={20}
        transform="rotate(-12 112 96)"
        fill="none"
        stroke="url(#ring)"
        strokeWidth={3}
      />
      <Path
        d="M120 14 156 28v32c0 28-15 47-36 56-21-9-36-28-36-56V28z"
        fill="url(#shield)"
      />
      {/* A lighter rim along the shield's left edge. */}
      <Path
        d="M120 14 84 28v32c0 28 15 47 36 56-16-11-27-30-27-56V33z"
        fill={tc('#ffffff', 'auto')}
        opacity={0.22}
      />
      <Path
        d="M110 60v-8a10 10 0 0 1 20 0v8"
        fill="none"
        stroke={tc('#ffffff')}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Rect
        x={103}
        y={59}
        width={34}
        height={29}
        rx={7}
        fill={tc('#ffffff', 'auto')}
      />
      <Circle cx={120} cy={71} r={3.8} fill={tc(BLUE, 'auto')} />
      <Rect
        x={118.3}
        y={72}
        width={3.4}
        height={8.5}
        rx={1.7}
        fill={tc(BLUE, 'auto')}
      />
      {/* The ring's front half passes over the shield. */}
      <Ellipse
        cx={112}
        cy={96}
        rx={78}
        ry={20}
        transform="rotate(-12 112 96)"
        fill="none"
        stroke="url(#ring)"
        strokeWidth={3}
        strokeDasharray="166 220"
      />
      <Circle cx={58} cy={38} r={6.5} fill={tc(BLUE, 'auto')} />
      <Circle cx={44} cy={70} r={4} fill={tc('#b9cdf5', 'auto')} />
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
      delay: 60 + index * 80,
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

/** A white panel holding one or more titled groups of rows. */
function Panel({ children }: { children: React.ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

function GroupTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.groupTitle}>
      {children}
    </Text>
  );
}

type RowProps = {
  title: string;
  subtitle: string;
  icon: string;
  /**
   * A switch on the right; a "Coming Soon" pill when `soon`; otherwise a
   * chevron, after `action` if given.
   */
  value?: boolean | null;
  action?: string | undefined;
  soon?: boolean;
  onPress: () => void;
};

function SecurityRow({
  title,
  subtitle,
  icon,
  value,
  action,
  soon,
  onPress,
}: RowProps) {
  const isSwitch = value !== undefined;
  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityLabel={`${title}, ${subtitle}${soon ? ', coming soon' : action ? `, ${action}` : ''}`}
      accessibilityState={
        isSwitch ? { checked: value ?? false, busy: value === null } : undefined
      }
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <Glyph d={icon} color={tc(INK)} size={22} strokeWidth={1.8} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {isSwitch ? (
        <Toggle value={value} />
      ) : soon ? (
        <View style={styles.soon}>
          <Text style={styles.soonText}>Coming Soon</Text>
        </View>
      ) : (
        <View style={styles.trailing}>
          {action ? <Text style={styles.action}>{action}</Text> : null}
          <Glyph d={ICONS.chevron} color={tc(INK)} size={20} />
        </View>
      )}
    </Pressable>
  );
}

function notAvailable(title: string) {
  Alert.alert(title, `${title} is not available yet.`);
}

export default function Security() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [phoneLock, setPhoneLock] = useState<boolean | null>(null);
  const [liveBiometrics, setLiveBiometrics] = useState<boolean | null>(null);

  // Read again on focus: the PIN or phone lock may change while away.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const owner = pinOwner();
      void (owner ? pinStore.hasPin(owner) : Promise.resolve(false))
        .catch(() => false)
        .then((value) => active && setHasPin(value));
      void phoneHasLock()
        .catch(() => false)
        .then((value) => active && setPhoneLock(value));
      void phoneHasBiometrics()
        .catch(() => false)
        .then((value) => active && setLiveBiometrics(value));
      return () => {
        active = false;
      };
    }, []),
  );

  const biometrics = uiPreviewEnabled
    ? previewSecurity.biometrics
    : liveBiometrics;
  const summary = securitySummary({ hasPin, phoneLock });

  function changePin() {
    const owner = pinOwner();
    if (!owner) {
      Alert.alert(
        'Transaction PIN',
        'Connect your wallet to set a payment PIN.',
      );
      return;
    }
    router.push(
      hasPin
        ? {
            pathname: '/pin-entry',
            params: { mode: 'change', next: 'profile' },
          }
        : { pathname: '/pin-setup', params: { next: 'profile' } },
    );
  }

  function explainBiometrics() {
    Alert.alert(
      'Face ID / Touch ID',
      biometrics
        ? 'TravelPe unlocks with the fingerprint or face set up on this phone. Manage them in your phone settings.'
        : 'Add a fingerprint or face in your phone settings to unlock TravelPe with it.',
    );
  }

  function explainAppLock() {
    Alert.alert(
      'App Lock',
      phoneLock === false
        ? 'Set a screen lock in your phone settings. TravelPe needs it to protect your wallet.'
        : 'App Lock is always on. TravelPe asks for your fingerprint, face or phone passcode when you open it.',
    );
  }

  const warning =
    summary.state === 'missing-pin' || summary.state === 'missing-lock';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroArt} pointerEvents="none">
            <ShieldHero />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/profile')
            }
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Glyph d={ICONS.back} color={tc(INK)} size={22} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Security
          </Text>
          <Text style={styles.subtitle}>Keep your account safe and secure</Text>
        </View>

        <Reveal index={0}>
          <Panel>
            <GroupTitle>Biometric Authentication</GroupTitle>
            <SecurityRow
              title="Face ID / Touch ID"
              subtitle="Quick and secure login"
              icon={ICONS.faceId}
              value={biometrics}
              onPress={explainBiometrics}
            />

            <GroupTitle>Two-Factor Authentication (2FA)</GroupTitle>
            <SecurityRow
              title="2FA Security"
              subtitle="Add an extra layer of protection"
              icon={ICONS.key}
              soon
              onPress={() =>
                Alert.alert(
                  'Two-Factor Authentication',
                  'Two-factor authentication is coming soon.',
                )
              }
            />

            <GroupTitle>Account Access & Devices</GroupTitle>
            <SecurityRow
              title="Login History"
              subtitle="View active sessions and devices"
              icon={ICONS.list}
              onPress={() => router.push('/login-activity')}
            />
            <SecurityRow
              title="App Lock"
              subtitle="Fingerprint, face or passcode to open"
              icon={ICONS.lock}
              value={phoneLock}
              onPress={explainAppLock}
            />
          </Panel>
        </Reveal>

        <Reveal index={1}>
          <Panel>
            <GroupTitle>Additional Security Options</GroupTitle>
            <SecurityRow
              title="Transaction PIN"
              subtitle="Manage your secure transaction PIN"
              icon={ICONS.pin}
              action={hasPin === false ? 'Set Up' : undefined}
              onPress={changePin}
            />
            <SecurityRow
              title="Manage Authorized Devices"
              subtitle="View and remove trusted devices"
              icon={ICONS.devices}
              onPress={() => notAvailable('Manage Authorized Devices')}
            />
          </Panel>
        </Reveal>

        <Reveal index={2}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${summary.title}. ${summary.subtitle}`}
            disabled={summary.state === 'loading'}
            onPress={
              summary.state === 'missing-pin'
                ? changePin
                : summary.state === 'missing-lock'
                  ? explainAppLock
                  : () => Alert.alert(summary.title, summary.subtitle)
            }
            style={({ pressed }) => [
              styles.summary,
              warning && styles.summaryWarning,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[styles.summaryIcon, warning && styles.summaryIconWarning]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path
                  d="M12 2.5 4.5 5.5v6c0 4.7 3.2 8.6 7.5 10 4.3-1.4 7.5-5.3 7.5-10v-6z"
                  fill={tc(warning ? '#f0a020' : BLUE, 'auto')}
                />
                <Path
                  d={warning ? 'M12 8v4.5 M12 16h.01' : 'M8.5 12l2.5 2.5 4.5-5'}
                  stroke={tc('#ffffff')}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.summaryTitle}>{summary.title}</Text>
              <Text style={styles.rowSubtitle}>{summary.subtitle}</Text>
            </View>
            {summary.state === 'loading' ? null : (
              <Glyph
                d={ICONS.chevron}
                color={tc(warning ? '#b45309' : BLUE)}
                size={20}
                strokeWidth={2.4}
              />
            )}
          </Pressable>
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: '#f2f5fb' },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  hero: { minHeight: 200, paddingTop: 10, paddingHorizontal: 4 },
  heroArt: { position: 'absolute', right: -26, top: 0 },
  back: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e4e9f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { color: INK, fontSize: 38, fontWeight: '800' },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 6,
    maxWidth: 200,
  },
  panel: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6ebf4',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    shadowColor: INK,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  groupTitle: {
    color: INK,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 2,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  rowPressed: { backgroundColor: '#f2f5fb' },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eef1f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 1 },
  rowTitle: { color: INK, fontSize: 17, fontWeight: '500' },
  rowSubtitle: { color: colors.muted, fontSize: 13.5, lineHeight: 18 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  action: { color: INK, fontSize: 16, fontWeight: '500' },
  soon: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#e8effe',
    borderWidth: 1,
    borderColor: '#cddcfb',
  },
  soonText: { color: BLUE, fontSize: 12, fontWeight: '700' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbe6fb',
    backgroundColor: '#eaf1fd',
  },
  summaryWarning: { borderColor: '#f6dcae', backgroundColor: '#fff7e8' },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#dbe7fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconWarning: { backgroundColor: '#fde9c4' },
  summaryTitle: { color: INK, fontSize: 15, fontWeight: '700' },
});
