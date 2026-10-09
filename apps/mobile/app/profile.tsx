import { useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import {
  Action,
  AppIcon,
  colors,
  TestNotice,
  ui,
} from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import {
  paymentKeyStore,
  revokeKeyCall,
} from '../src/features/account/payment-key';
import { phoneHasLock } from '../src/features/account/device-lock';
import { pinStore } from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';
import { rememberedAccount } from '../src/features/account/remembered-account';
import { logoutSession } from '../src/features/account/session';
import { publicClient } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { formatPathUsdAtomic } from '../src/features/payment/amount';
import { previewTapToPay } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

// Sample identity for the UI preview only; wallet mode shows the wallet.
const PREVIEW_PROFILE = { name: 'Rupesh Kumar', email: 'rupesh@gmail.com' };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const previewAvatar = require('../assets/profile-avatar.png');

// Outline icons on a 24px grid for the account menu.
const MENU = [
  {
    title: 'Personal Information',
    subtitle: 'Name, email, phone',
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

function shortDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** App lock and payment confirmation, both using the phone's own lock. */
function SecurityCard() {
  const lock = useQuery({
    queryKey: ['phone-lock'],
    queryFn: phoneHasLock,
    retry: false,
  });
  const owner = pinOwner();
  const pin = useQuery({
    queryKey: ['payment-pin', owner],
    queryFn: () => pinStore.hasPin(owner!),
    enabled: Boolean(owner),
    retry: false,
  });
  return (
    <View style={styles.card}>
      <Text style={ui.heading}>Security</Text>
      <Text style={ui.caption}>
        {lock.isPending
          ? 'Checking…'
          : lock.data
            ? 'App lock is on. When you come back to TravelPe, unlock it with your fingerprint, face or phone PIN.'
            : 'Set a screen lock on your phone to protect TravelPe. Until then the app is not locked.'}
      </Text>
      <Text style={ui.caption}>
        {pin.data
          ? 'Payments are approved with your 4-digit TravelPe PIN.'
          : 'Set a 4-digit TravelPe PIN to approve payments.'}
      </Text>
      {owner && pin.isFetched ? (
        <Action
          secondary
          title={pin.data ? 'Change PIN' : 'Set PIN'}
          onPress={() =>
            router.push(
              pin.data
                ? {
                    pathname: '/pin-entry',
                    params: { mode: 'change', next: 'profile' },
                  }
                : { pathname: '/pin-setup', params: { next: 'profile' } },
            )
          }
        />
      ) : null}
    </View>
  );
}

/** Tap-to-pay state from the chain, with turn on / turn off. */
function TapToPayCard({ owner }: { owner: string | undefined }) {
  const queryClient = useQueryClient();
  const [turningOff, setTurningOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useQuery({
    queryKey: ['payment-key', owner],
    queryFn: () => paymentKeyStore.status(owner!),
    enabled: Boolean(!uiPreviewEnabled && owner),
    retry: false,
  });

  async function turnOff() {
    const current = status.data;
    if (!owner || !current || current.state === 'none') return;
    setTurningOff(true);
    setError(null);
    try {
      if (current.state === 'active') {
        const hash = await walletStore.sendTransaction(
          revokeKeyCall(current.key),
        );
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 90_000,
        });
        if (receipt.status !== 'success') {
          throw new Error(
            'Tempo rejected the request. Tap to pay is still on.',
          );
        }
      }
      await paymentKeyStore.remove(owner);
      await queryClient.invalidateQueries({ queryKey: ['payment-key'] });
    } catch (cause) {
      setError(walletError(cause));
    } finally {
      setTurningOff(false);
    }
  }

  const confirmTurnOff = () =>
    Alert.alert(
      'Turn off tap to pay?',
      'Approve once in MetaMask. After that, each payment opens MetaMask.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => void turnOff(),
        },
      ],
    );

  let summary: string;
  let detail: string | null = null;
  let action: {
    title: string;
    onPress: () => void;
    secondary?: boolean;
  } | null = null;
  const data = status.data;
  if (uiPreviewEnabled) {
    summary = `On · $${previewTapToPay.dailyLimitUsd} a day until ${shortDate(previewTapToPay.expiry)}`;
    detail = `$${previewTapToPay.remainingUsd} left today`;
    action = {
      title: 'Turn off tap to pay',
      onPress: confirmTurnOff,
      secondary: true,
    };
  } else if (!owner) {
    summary = 'Connect MetaMask to use tap to pay.';
  } else if (status.isPending) {
    summary = 'Checking…';
  } else if (status.isError || !data) {
    summary = "Couldn't check tap to pay. Try again shortly.";
  } else if (data.state === 'active') {
    summary = `On · $${data.key.dailyLimitUsd} a day until ${shortDate(data.key.expiry)}`;
    detail = `$${formatPathUsdAtomic(data.remainingAtomic)} left today`;
    action = {
      title: turningOff ? 'Turning off…' : 'Turn off tap to pay',
      onPress: confirmTurnOff,
      secondary: true,
    };
  } else if (data.state === 'none') {
    summary = 'Off. Each payment opens MetaMask.';
    action = {
      title: 'Turn on tap to pay',
      onPress: () => router.push('/setup-payments'),
    };
  } else {
    summary =
      data.state === 'expired'
        ? `Ended on ${shortDate(data.key.expiry)}. Each payment opens MetaMask.`
        : 'Turned off. Each payment opens MetaMask.';
    action = {
      title: 'Turn on again',
      onPress: () => router.push('/setup-payments'),
    };
  }

  return (
    <View style={styles.card}>
      <Text style={ui.heading}>Tap to pay</Text>
      <Text style={ui.caption}>{summary}</Text>
      {detail ? <Text style={ui.caption}>{detail}</Text> : null}
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {action ? (
        <Action
          title={action.title}
          secondary={action.secondary ?? false}
          disabled={turningOff}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  );
}

export default function Profile() {
  const { wallet, onTempo } = useAccount();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const lock = useRef(false);
  const address = wallet.account?.address;

  async function disconnect() {
    if (uiPreviewEnabled || lock.current || walletStore.getSnapshot().busy)
      return;
    lock.current = true;
    setLeaving(true);
    try {
      await rememberedAccount.forget();
      // A forgotten PIN is reset by signing in again.
      const signedIn = walletStore.getSnapshot().account?.address;
      if (signedIn) await pinStore.clear(signedIn);
      await logoutSession();
    } catch {
      /* The local session is cleared even if revocation is unavailable. */
    } finally {
      await walletStore.disconnect();
      await queryClient.cancelQueries({ queryKey: ['session'] });
      queryClient.removeQueries({ queryKey: ['session'] });
      queryClient.removeQueries({ queryKey: ['tempo-pathUSD'] });
      router.replace('/connect');
      lock.current = false;
      setLeaving(false);
    }
  }

  const name = uiPreviewEnabled ? PREVIEW_PROFILE.name : 'Traveller';
  const detail = uiPreviewEnabled
    ? PREVIEW_PROFILE.email
    : address
      ? shortAddress(address)
      : 'Wallet not connected';
  const status = uiPreviewEnabled
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => notAvailable('Settings')}
            style={({ pressed }) => [
              styles.settings,
              pressed && styles.pressed,
            ]}
          >
            <Glyph
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
              color={colors.ink}
              size={24}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${detail}. Personal information`}
          onPress={() => notAvailable('Personal Information')}
          style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {uiPreviewEnabled ? (
                  <Image
                    source={previewAvatar}
                    accessibilityIgnoresInvertColors
                    style={styles.avatarImage}
                  />
                ) : (
                  <AppIcon name="person" color="#ffffff" size={34} />
                )}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile photo"
              hitSlop={6}
              onPress={() => notAvailable('Profile photo')}
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
              onPress={() => notAvailable(item.title)}
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

          {!uiPreviewEnabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: leaving || wallet.busy }}
              disabled={leaving || wallet.busy}
              onPress={() =>
                address ? void disconnect() : router.push('/connect')
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

        <TapToPayCard owner={address} />
        <SecurityCard />

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
  card: { backgroundColor: '#f4f8ff', borderRadius: 16, padding: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerCopy: { flex: 1, gap: 2 },
  title: { color: '#000000', fontSize: 42, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, fontWeight: '500' },
  settings: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#f7f9fd',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#081332',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
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
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#4c8dff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
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
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#e5372f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
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
