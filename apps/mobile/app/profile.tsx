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
import { MetaMaskLogo } from '../src/components/payment-logos';
import { ProfileAvatar } from '../src/components/profile-avatar';
import { ProfileBackdrop } from '../src/components/profile-backdrop';
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
import { previewWalletAddress } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

type MenuId =
  | 'personal'
  | 'payment-methods'
  | 'tap-to-pay'
  | 'security'
  | 'notifications'
  | 'help'
  | 'terms';

// Outline icons on a 24px grid, grouped into the Profile menu cards.
const SECTIONS: readonly {
  label: string;
  items: readonly {
    id: MenuId;
    title: string;
    subtitle: string;
    tint: string;
    background: string;
    icon: string;
  }[];
}[] = [
  {
    label: 'Account & wallet',
    items: [
      {
        id: 'personal',
        title: 'Personal Information',
        subtitle: 'Name, email, date of birth',
        tint: '#2f6bff',
        background: '#e3edff',
        icon: 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M3 21c0-3.6 2.9-6 7-6 1 0 2 .2 2.8.4 M15 17h6v4h-6z M16.5 17v-1.5a1.5 1.5 0 0 1 3 0V17',
      },
      {
        id: 'payment-methods',
        title: 'Payment Methods',
        subtitle: 'Stablecoins, UPI, bank accounts',
        tint: '#5b4bdb',
        background: '#ebe7ff',
        icon: 'M3 6h18v12H3z M3 10h18 M6.5 14.5h4',
      },
      {
        id: 'tap-to-pay',
        title: 'Tap to Pay',
        subtitle: 'Contactless payments & devices',
        tint: '#1f7cf5',
        background: '#e6f0fd',
        icon: 'M5 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 13 21H5a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 5 3z M7.5 16.5h3 M17 9.5a3.5 3.5 0 0 1 0 5 M19.5 7a7 7 0 0 1 0 10',
      },
    ],
  },
  {
    label: 'Security & preferences',
    items: [
      {
        id: 'security',
        title: 'Security',
        subtitle: 'PIN, biometrics, sessions',
        tint: '#22a35a',
        background: '#e2f6ea',
        icon: 'M12 2.5 4.5 5.5v6c0 4.7 3.2 8.6 7.5 10 4.3-1.4 7.5-5.3 7.5-10v-6z M8.5 12l2.5 2.5 4.5-5',
      },
      {
        id: 'notifications',
        title: 'Notifications',
        subtitle: 'Payment alerts, instant updates',
        tint: '#e8960c',
        background: '#fff3dc',
        icon: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
      },
    ],
  },
  {
    label: 'Support & legal',
    items: [
      {
        id: 'help',
        title: 'Help & Support',
        subtitle: '24/7 support bot & ticket system',
        tint: '#e5484d',
        background: '#fde6e6',
        icon: 'M4 14v-2a8 8 0 0 1 16 0v2 M4 14h3v5H5a1 1 0 0 1-1-1z M20 14h-3v5h2a1 1 0 0 0 1-1z M17 19c0 1.5-1.5 2.5-4 2.5',
      },
      {
        id: 'terms',
        title: 'Terms & Privacy',
        subtitle: 'Non-custodial smart contract legal',
        tint: '#6a4be0',
        background: '#ede7ff',
        icon: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',
      },
    ],
  },
];

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

function Bolt({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="M13 2 3 14h9l-1 8 10-12h-9z" fill={color} />
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
  const email = details?.email || googleProfile?.email || 'Add your email';
  const editProfile = () => router.push('/edit-profile');
  // Preview shows a sample wallet; wallet mode only ever shows the real one.
  const walletAddress =
    address ?? (uiPreviewEnabled && !explorer ? previewWalletAddress : null);
  const walletReady = Boolean(walletAddress) && (uiPreviewEnabled || onTempo);
  const status = uiPreviewEnabled
    ? 'Verified Account'
    : explorer
      ? 'Google account'
      : address
        ? 'MetaMask account'
        : null;

  function openItem(id: MenuId, title: string) {
    switch (id) {
      case 'personal':
        return editProfile();
      case 'payment-methods':
        return router.push('/payment-methods');
      case 'tap-to-pay':
        return explorer
          ? void connecting.signIn()
          : router.push('/setup-payments');
      case 'security':
        return router.push('/security');
      case 'notifications':
        return router.push('/notifications');
      case 'help':
        return router.push('/help');
      case 'terms':
        return router.push('/terms');
      default:
        return notAvailable(title);
    }
  }

  const walletLine = walletAddress
    ? `Connected: ${shortAddress(walletAddress)}`
    : 'Wallet not connected';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Profile
          </Text>
          <Text style={styles.subtitle}>
            Manage your account, wallet & payments
          </Text>
        </View>

        <View style={styles.identityCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${email}. Personal information`}
            onPress={editProfile}
            style={({ pressed }) => [
              styles.identity,
              pressed && styles.pressed,
            ]}
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
                  size={12}
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
                {email}
              </Text>
              {status ? (
                <View style={styles.verifiedTag}>
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
            <Glyph d="M9 6l6 6-6 6" color="#3d4c66" size={22} />
          </Pressable>

          <Pressable
            accessibilityRole={walletAddress ? undefined : 'button'}
            accessibilityLabel={
              walletAddress
                ? `${walletLine}. ${walletReady ? 'Gasless active' : 'Switch to Tempo Moderato'}`
                : 'Wallet not connected. Connect MetaMask'
            }
            disabled={Boolean(walletAddress) || leaving || wallet.busy}
            onPress={() => void connecting.signIn()}
            style={({ pressed }) => [
              styles.walletStrip,
              pressed && styles.pressed,
            ]}
          >
            <MetaMaskLogo size={20} />
            <Text numberOfLines={1} selectable style={styles.walletText}>
              {walletLine}
            </Text>
            {walletAddress ? (
              walletReady ? (
                <View style={[styles.pill, styles.gaslessPill]}>
                  <Bolt color="#178a45" />
                  <Text style={[styles.pillText, styles.gaslessText]}>
                    Gasless Active
                  </Text>
                </View>
              ) : (
                <View style={[styles.pill, styles.warningPill]}>
                  <Text style={[styles.pillText, styles.warningText]}>
                    Wrong network
                  </Text>
                </View>
              )
            ) : (
              <View style={[styles.pill, styles.connectPill]}>
                <Text style={[styles.pillText, styles.connectText]}>
                  {connecting.busy ? 'Connecting…' : 'Connect'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.label} style={styles.group}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.subtitle}`}
                onPress={() => openItem(item.id, item.title)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View
                  style={[styles.rowIcon, { backgroundColor: item.background }]}
                >
                  <Glyph d={item.icon} color={item.tint} size={24} />
                </View>
                <View style={styles.rowCopy}>
                  {index === 0 ? (
                    <Text style={styles.groupLabel}>{section.label}</Text>
                  ) : null}
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.rowSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
                <Glyph d="M9 6l6 6-6 6" color="#3d4c66" size={20} />
              </Pressable>
            ))}
          </View>
        ))}

        {googleProfile || !uiPreviewEnabled || explorer ? (
          <View style={styles.group}>
            {googleProfile ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sign out of Google, ${googleProfile.email}`}
                onPress={() => void signOutOfGoogle()}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={[styles.rowIcon, styles.dangerIcon]}>
                  <AppIcon name="person" color={colors.error} size={22} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, styles.dangerTitle]}>
                    Sign out of Google
                  </Text>
                  <Text numberOfLines={1} style={styles.rowSubtitle}>
                    {googleProfile.email}
                  </Text>
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
                <View style={[styles.rowIcon, styles.dangerIcon]}>
                  <AppIcon name="wallet" color={colors.error} size={22} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, styles.dangerTitle]}>
                    {leaving
                      ? 'Disconnecting…'
                      : address
                        ? 'Disconnect wallet'
                        : 'Connect wallet'}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowSubtitle}>
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
        ) : null}

        {!uiPreviewEnabled ? <TestNotice /> : null}
      </ScrollView>
      <DashboardNav disabled={leaving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef4fe' },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  header: { gap: 4, marginBottom: 4 },
  title: {
    color: colors.ink,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.muted, fontSize: 15, fontWeight: '500' },
  identityCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d3deef',
    backgroundColor: '#f4f8ff',
    overflow: 'hidden',
    shadowColor: '#081332',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  avatarWrap: { width: 68, height: 68 },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2f6bff',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  nameBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2f6bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { color: '#3d4c66', fontSize: 14 },
  verifiedTag: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7dcb6',
    backgroundColor: '#eaf8ee',
    flexShrink: 1,
  },
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
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  walletStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#dbe4f2',
    backgroundColor: '#eaf1fc',
  },
  walletText: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  gaslessPill: { borderColor: '#a7dcb6', backgroundColor: '#e3f6e9' },
  gaslessText: { color: '#14632f' },
  warningPill: { borderColor: '#f3cf8a', backgroundColor: '#fff4dd' },
  warningText: { color: '#8a5300' },
  connectPill: { borderColor: '#b9cff5', backgroundColor: '#e3edff' },
  connectText: { color: colors.accent },
  group: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1e8f3',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    shadowColor: '#081332',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  groupLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 1 },
  rowTitle: { color: '#000000', fontSize: 17, fontWeight: '700' },
  rowSubtitle: { color: '#3d4c66', fontSize: 14 },
  dangerIcon: { backgroundColor: '#fde8e6' },
  dangerTitle: { color: colors.error },
});
