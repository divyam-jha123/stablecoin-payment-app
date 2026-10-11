import { useCallback, useEffect, useRef, useState } from 'react';
import { router, Stack, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
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
import { authenticate } from '../src/features/account/device-lock';
import { relativeTime } from '../src/features/account/login-activity';
import {
  listAuthorizedDevices,
  removeAuthorizedDevice,
  type AuthorizedDevice,
} from '../src/features/account/session';
import { previewAuthorizedDevices } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

const BLUE = '#2f6bff';
const INK = '#081332';
const RED = '#d92d20';

// Outline icons on a 24px grid.
const ICONS = {
  back: 'M15 6l-6 6 6 6',
  phone:
    'M8 2.5h8a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 19V5A2.5 2.5 0 0 1 8 2.5z M10.5 5.5h3',
  tablet:
    'M6 2.5h12a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z M11 18.5h2',
  wallet:
    'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3 M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V8H6.5A2.5 2.5 0 0 1 4 7.5z M16 14h.01',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M8.5 12l2.5 2.5 4.5-5',
  alert: 'M12 3 2.5 20h19z M12 10v4.5 M12 17.5h.01',
  lock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
} as const;

type Load =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'error' }
  | { state: 'ready'; devices: AuthorizedDevice[] };

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

function deviceIcon(name: string) {
  return /ipad|tablet|tab\b/i.test(name) ? ICONS.tablet : ICONS.phone;
}

/** A card or panel message for loading, signed-out, error and empty states. */
function Notice({
  icon,
  tint,
  background,
  title,
  text,
  action,
  onAction,
}: {
  icon: string;
  tint: string;
  background: string;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.notice}>
      <View style={[styles.noticeIcon, { backgroundColor: background }]}>
        <Glyph d={icon} color={tint} size={26} />
      </View>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{text}</Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.noticeButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.noticeButtonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AuthorizedDevices() {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [removing, setRemoving] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const request = useRef(0);

  const refresh = useCallback(() => {
    const id = ++request.current;
    setNow(Date.now());
    if (uiPreviewEnabled) {
      setLoad((current) =>
        current.state === 'ready'
          ? current
          : { state: 'ready', devices: [...previewAuthorizedDevices] },
      );
      return;
    }
    setLoad({ state: 'loading' });
    void listAuthorizedDevices()
      .then((devices) => {
        if (id !== request.current) return;
        setLoad(
          devices ? { state: 'ready', devices } : { state: 'signed-out' },
        );
      })
      .catch(() => {
        if (id === request.current) setLoad({ state: 'error' });
      });
  }, []);

  useFocusEffect(refresh);

  async function remove(device: AuthorizedDevice) {
    if (removing) return;
    setRemoving(device.id);
    try {
      if (!(await authenticate(`Remove ${device.device}`))) return;
      if (!uiPreviewEnabled) await removeAuthorizedDevice(device.id);
      setLoad((current) =>
        current.state === 'ready'
          ? {
              state: 'ready',
              devices: current.devices.filter(
                (entry) => entry.id !== device.id,
              ),
            }
          : current,
      );
    } catch (error) {
      Alert.alert(
        'Could not remove device',
        error instanceof Error && error.message
          ? error.message
          : 'Please try again.',
      );
      refresh();
    } finally {
      setRemoving(null);
    }
  }

  function confirmRemove(device: AuthorizedDevice) {
    Alert.alert(
      `Remove ${device.device}?`,
      'It will be signed out of this wallet and must sign in with MetaMask again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void remove(device),
        },
      ],
    );
  }

  const current =
    load.state === 'ready' ? load.devices.find((entry) => entry.current) : null;
  const others =
    load.state === 'ready'
      ? load.devices.filter((entry) => !entry.current)
      : [];

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
          Authorized Devices
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {load.state === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator
              accessibilityLabel="Loading devices"
              color={BLUE}
            />
          </View>
        ) : load.state === 'signed-out' ? (
          <Reveal index={0}>
            <Notice
              icon={ICONS.wallet}
              tint={BLUE}
              background="#e3edff"
              title="Connect your wallet"
              text="Devices are listed for your MetaMask wallet. Connect it to see where it is signed in."
              action="Go to Profile"
              onAction={() => router.replace('/profile')}
            />
          </Reveal>
        ) : load.state === 'error' ? (
          <Reveal index={0}>
            <Notice
              icon={ICONS.alert}
              tint="#b45309"
              background="#fde9c4"
              title="Could not load devices"
              text="Check your connection and try again."
              action="Try again"
              onAction={refresh}
            />
          </Reveal>
        ) : (
          <>
            {current ? (
              <Reveal index={0}>
                <Text style={styles.sectionLabel}>THIS DEVICE</Text>
                <View
                  accessible
                  accessibilityLabel={`${current.device}, current device, signed in ${relativeTime(current.signedInAt, now)}`}
                  style={styles.deviceCard}
                >
                  <View style={styles.deviceIcon}>
                    <Glyph
                      d={deviceIcon(current.device)}
                      color={INK}
                      size={40}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={styles.deviceCopy}>
                    <Text numberOfLines={1} style={styles.deviceName}>
                      {current.device}
                    </Text>
                    <Text numberOfLines={1} style={styles.deviceDetail}>
                      Signed in {relativeTime(current.signedInAt, now)}
                    </Text>
                  </View>
                  <View style={styles.currentPill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.currentText}>Current</Text>
                  </View>
                </View>
              </Reveal>
            ) : null}

            <Reveal index={1}>
              <Text style={styles.sectionLabel}>OTHER DEVICES</Text>
              {others.length ? (
                <View style={styles.panel}>
                  {others.map((device, index) => (
                    <View
                      key={device.id}
                      style={[styles.row, index > 0 && styles.rowDivider]}
                    >
                      <View style={styles.rowIcon}>
                        <Glyph
                          d={deviceIcon(device.device)}
                          color={INK}
                          size={22}
                          strokeWidth={1.8}
                        />
                      </View>
                      <View
                        accessible
                        accessibilityLabel={`${device.device}, active ${relativeTime(device.lastSeenAt, now)}`}
                        style={styles.deviceCopy}
                      >
                        <Text numberOfLines={1} style={styles.rowTitle}>
                          {device.device}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowDetail}>
                          Active {relativeTime(device.lastSeenAt, now)}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${device.device}`}
                        disabled={removing !== null}
                        hitSlop={6}
                        onPress={() => confirmRemove(device)}
                        style={({ pressed }) => [
                          styles.remove,
                          (pressed || removing === device.id) && styles.pressed,
                        ]}
                      >
                        {removing === device.id ? (
                          <ActivityIndicator size="small" color={RED} />
                        ) : (
                          <Text style={styles.removeText}>Remove</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Notice
                  icon={ICONS.check}
                  tint="#1f9d55"
                  background="#dcf5e6"
                  title="No other devices"
                  text="Your wallet is signed in on this phone only."
                />
              )}
            </Reveal>
          </>
        )}

        <View style={styles.footer}>
          <Glyph d={ICONS.lock} color={colors.muted} size={14} />
          <Text style={styles.footerText}>
            Removing a device signs it out of your wallet right away.
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
  loading: { paddingVertical: 48, alignItems: 'center' },
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
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e8eef8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#eef2f8' },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eef1f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: INK, fontSize: 16, fontWeight: '600' },
  rowDetail: { color: colors.muted, fontSize: 13 },
  remove: {
    minWidth: 82,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f7c9c4',
    backgroundColor: '#fff3f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: RED, fontSize: 14, fontWeight: '700' },
  notice: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#f7f8fa',
  },
  noticeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noticeTitle: { color: INK, fontSize: 17, fontWeight: '700' },
  noticeText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noticeButton: {
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: { color: colors.muted, fontSize: 12.5 },
});
