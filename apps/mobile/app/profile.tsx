import { useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { AppIcon, colors, TestNotice } from '../src/components/payment-ui';
import { ProfileAvatar } from '../src/components/profile-avatar';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import { googleAccount } from '../src/features/account/google-account';
import { useWalletSignIn } from '../src/features/account/use-wallet-sign-in';
import { useExplorer } from '../src/features/account/use-explorer';
import { routeAfterSignOut } from '../src/features/account/returning-user';
import { recordLoginActivity } from '../src/features/account/login-activity-store';
import { rememberedAccount } from '../src/features/account/remembered-account';
import { logoutSession } from '../src/features/account/session';
import { useProfileDetails } from '../src/features/account/profile-details-store';
import { uiPreviewEnabled } from '../src/ui-preview';

// Outline icons on a 24px grid for the account menu.
const MENU = [
  {
    title: 'Personal Information',
    subtitle: 'Name, email, date of birth',
    tint: '#2f6bff',
    background: '#e3edff',
    icon: 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M3 21c0-3.6 2.9-6 7-6 1 0 2 .2 2.8.4 M15 17h6v4h-6z M16.5 17v-1.5a1.5 1.5 0 0 1 3 0V17',
  },
  {
    title: 'Payment Methods',
    subtitle: 'Bank accounts, UPI, cards',
    tint: '#5b4bdb',
    background: '#ebe7ff',
    icon: 'M3 6h18v12H3z M3 10h18 M6.5 14.5h4',
  },
  {
    title: 'Tap to Pay',
    subtitle: 'Contactless payments & devices',
    tint: '#1f7cf5',
    background: '#e6f0fd',
    icon: 'M5 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 13 21H5a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 5 3z M7.5 16.5h3 M17 9.5a3.5 3.5 0 0 1 0 5 M19.5 7a7 7 0 0 1 0 10',
  },
  {
    title: 'Security',
    subtitle: 'PIN, biometrics, devices',
    tint: '#22a35a',
    background: '#e2f6ea',
    icon: 'M12 2.5 4.5 5.5v6c0 4.7 3.2 8.6 7.5 10 4.3-1.4 7.5-5.3 7.5-10v-6z M8.5 12l2.5 2.5 4.5-5',
  },
  {
    title: 'Notifications',
    subtitle: 'Payment alerts, offers',
    tint: '#f0a020',
    background: '#fff3dc',
    icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  },
  {
    title: 'Help & Support',
    subtitle: 'Get help, report an issue',
    tint: '#e5484d',
    background: '#fde6e6',
    icon: 'M4 14v-2a8 8 0 0 1 16 0v2 M4 14h3v5H5a1 1 0 0 1-1-1z M20 14h-3v5h2a1 1 0 0 0 1-1z M17 19c0 1.5-1.5 2.5-4 2.5',
  },
  {
    title: 'Terms & Privacy',
    subtitle: 'Legal information',
    tint: '#6a4be0',
    background: '#ede7ff',
    icon: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',
  },
] as const;

function Glyph({
  d,
  color,
  size = 24,
}: {
  d: string;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function notAvailable(title: string) {
  Alert.alert(title, `${title} is not available yet.`);
}

export default function Profile() {
  const { wallet, onTempo } = useAccount();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const lock = useRef(false);
  const address = wallet.account?.address;
  const { profile: googleProfile, explorer } = useExplorer();
  // Connect MetaMask right here; onboarding is only for signed-out visitors.
  const connecting = useWalletSignIn({
    onDone: () => {},
  });

  async function signOutOfGoogle() {
    if (lock.current || connecting.busy || walletStore.getSnapshot().busy)
      return;
    lock.current = true;
    setLeaving(true);
    try {
      await googleAccount.clear();
      router.replace(await routeAfterSignOut());
    } catch {
      Alert.alert('Could not sign out', 'Please try again.');
    } finally {
      lock.current = false;
      setLeaving(false);
    }
  }

  async function disconnect() {
    if (
      uiPreviewEnabled ||
      lock.current ||
      connecting.busy ||
      walletStore.getSnapshot().busy
    )
      return;
    lock.current = true;
    setLeaving(true);
    try {
      if (address) recordLoginActivity('sign-out', address);
      await rememberedAccount.forget();
      await queryClient.cancelQueries({ queryKey: ['session'] });
      // Remote revocation may be unavailable; still clear the wallet locally.
      await logoutSession().catch(() => undefined);
      await walletStore.disconnect();
      queryClient.removeQueries({ queryKey: ['session'] });
      queryClient.removeQueries({ queryKey: ['tempo-pathUSD'] });
      router.replace(await routeAfterSignOut());
    } catch {
      Alert.alert('Could not disconnect', 'Please try again.');
    } finally {
      lock.current = false;
      setLeaving(false);
    }
  }

  // Details saved on Edit Profile win; a Google sign-in fills what is missing.
  const details = useProfileDetails(address);
  const name = details?.name || googleProfile?.name || 'Traveller';
  const detail =
    details?.email ||
    googleProfile?.email ||
    (address ? shortAddress(address) : 'Wallet not connected');
  const editProfile = () => router.push('/edit-profile');
  const status = explorer
    ? 'Google account · wallet not connected'
    : uiPreviewEnabled
      ? 'Verified Account'
      : address
        ? onTempo
          ? 'Wallet connected'
          : 'Switch to Tempo Moderato'
        : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>
              Profile
            </Text>
            <Text style={styles.subtitle}>
              Manage your account, security & payments
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${detail}. Personal information`}
          onPress={editProfile}
          style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
        >
          <View style={styles.avatarWrap}>
            <ProfileAvatar
              name={name}
              photoUri={details?.photoUri ?? null}
              size={68}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              hitSlop={6}
              onPress={editProfile}
              style={({ pressed }) => [
                styles.editBadge,
                pressed && styles.pressed,
              ]}
            >
              <Glyph
                d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4"
                color="#ffffff"
                size={14}
              />
            </Pressable>
          </View>
          <View style={styles.identityCopy}>
            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={styles.name}
              >
                {name}
              </Text>
              {uiPreviewEnabled ? (
                <View accessibilityLabel="Verified" style={styles.nameBadge}>
                  <AppIcon name="check" size={12} color="#ffffff" />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} selectable style={styles.email}>
              {detail}
            </Text>
            <View style={styles.tags}>
              {status ? (
                <View style={[styles.tag, styles.verifiedTag]}>
                  <View style={styles.verifiedDot}>
                    <AppIcon name="check" size={9} color="#ffffff" />
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={styles.verifiedText}
                  >
                    {status}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.chevronCircle}>
            <Glyph d="M9 6l6 6-6 6" color={colors.ink} size={20} />
          </View>
        </Pressable>

        <View style={styles.menu}>
          {MENU.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.subtitle}`}
              onPress={() =>
                item.title === 'Personal Information'
                  ? editProfile()
                  : explorer && item.title === 'Tap to Pay'
                    ? void connecting.signIn()
                    : item.title === 'Tap to Pay'
                      ? router.push('/setup-payments')
                      : item.title === 'Security'
                        ? router.push('/security')
                        : item.title === 'Notifications'
                          ? router.push('/notifications')
                          : item.title === 'Help & Support'
                            ? router.push('/help')
                            : item.title === 'Terms & Privacy'
                              ? router.push('/terms')
                              : notAvailable(item.title)
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View
                style={[styles.rowIcon, { backgroundColor: item.background }]}
              >
                <Glyph d={item.icon} color={item.tint} size={28} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Glyph d="M9 6l6 6-6 6" color={colors.ink} size={22} />
            </Pressable>
          ))}

          {googleProfile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sign out of Google, ${googleProfile.email}`}
              onPress={() => void signOutOfGoogle()}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.rowIcon, styles.walletIcon]}>
                <AppIcon name="person" color={colors.error} size={24} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, styles.walletTitle]}>
                  Sign out of Google
                </Text>
                <Text style={styles.rowSubtitle}>{googleProfile.email}</Text>
              </View>
            </Pressable>
          ) : null}

          {!uiPreviewEnabled || explorer ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: leaving || wallet.busy }}
              disabled={leaving || wallet.busy}
              onPress={() =>
                address ? void disconnect() : void connecting.signIn()
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.rowIcon, styles.walletIcon]}>
                <AppIcon name="wallet" color={colors.error} size={24} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, styles.walletTitle]}>
                  {leaving
                    ? 'Disconnecting…'
                    : address
                      ? 'Disconnect wallet'
                      : 'Connect wallet'}
                </Text>
                <Text style={styles.rowSubtitle}>
                  {address
                    ? onTempo
                      ? 'MetaMask · Tempo Moderato testnet'
                      : 'Switch to Tempo Moderato to use the app'
                    : 'Sign in with MetaMask'}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        {!uiPreviewEnabled ? <TestNotice /> : null}
      </ScrollView>
      <DashboardNav disabled={leaving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: '#000000', fontSize: 42, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, fontWeight: '500' },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dfe8f7',
    backgroundColor: '#f5f8fe',
    shadowColor: '#081332',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarWrap: { width: 68, height: 68 },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2f6bff',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2f6bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 9,
    flexShrink: 1,
    borderWidth: 1,
  },
  identityCopy: { flex: 1, gap: 3 },
  name: { color: '#0b0f1f', fontSize: 18, fontWeight: '800', flexShrink: 1 },
  email: { color: colors.muted, fontSize: 14 },
  verifiedTag: { borderColor: '#a7dcb6', backgroundColor: '#eaf8ee' },
  verifiedDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22a35a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    color: '#14532d',
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: { gap: 2, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  rowIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: '#000000', fontSize: 17, fontWeight: '700' },
  rowSubtitle: { color: colors.muted, fontSize: 14 },
  walletIcon: { backgroundColor: '#fde8e6' },
  walletTitle: { color: colors.error },
});
