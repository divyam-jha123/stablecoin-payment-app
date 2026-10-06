import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Action,
  AppIcon,
  colors,
  PaymentScreen,
  ScanIcon,
  ui,
} from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { uiPreviewEnabled } from '../src/ui-preview';
import { DashboardNav } from '../src/components/dashboard-nav';

// Metro bundles this static Figma asset at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const merchantBanner = require('../assets/figma/home-merchant-banner.png');

export default function Home() {
  const { wallet, onTempo, session, foreground } = useAccount();
  const address = wallet.account?.address;
  const [funding, setFunding] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{
    address: string;
    text: string;
  } | null>(null);
  const fundingLock = useRef(false);
  const authorized =
    uiPreviewEnabled || Boolean(address && onTempo && session.data === true);
  const navigatingDisabled = wallet.busy;
  const fundingUnavailable =
    !uiPreviewEnabled && (funding || navigatingDisabled || cooldown > 0);

  const balance = useQuery({
    queryKey: ['tempo-pathUSD', address, wallet.account?.chainId],
    queryFn: () => tempoService.balance(address!),
    enabled: !uiPreviewEnabled && authorized && foreground && !wallet.busy,
    retry: false,
    staleTime: 0,
    refetchInterval: foreground ? 15_000 : false,
  });
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function fund() {
    if (uiPreviewEnabled) return;
    const current = walletStore.getSnapshot();
    if (
      !authorized ||
      !address ||
      current.busy ||
      fundingLock.current ||
      cooldown ||
      current.account?.address !== address ||
      current.account.chainId !== TEMPO_CHAIN.id
    )
      return;
    fundingLock.current = true;
    setFunding(true);
    setCooldown(60);
    setNotice(null);
    try {
      await tempoService.fund(address);
      setNotice({
        address,
        text: 'Test funds requested. Refresh your balance to check delivery.',
      });
      if (walletStore.getSnapshot().account?.address === address)
        await balance.refetch();
    } catch (cause) {
      setNotice({
        address,
        text:
          walletError(cause) +
          ' Refresh your balance before requesting funds again.',
      });
    } finally {
      fundingLock.current = false;
      setFunding(false);
    }
  }

  if (
    !uiPreviewEnabled &&
    (!address || !onTempo || session.data === false || session.isError)
  )
    return <Redirect href="/connect" />;
  if (!authorized)
    return (
      <PaymentScreen>
        <ActivityIndicator color={colors.ink} />
        <Text style={ui.body}>Checking your sign-in…</Text>
      </PaymentScreen>
    );

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Hi, traveller 👋</Text>
            <Text style={styles.subGreeting}>Good to see you back!</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>TESTNET</Text>
          </View>
        </View>
        <View style={styles.balance}>
          <View style={styles.balanceMetaRow}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.token}>◉ pathUSD</Text>
          </View>
          <Text
            selectable
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLiveRegion="polite"
            style={styles.amount}
          >
            {uiPreviewEnabled
              ? '—'
              : balance.isError
                ? 'Unavailable'
                : (balance.data ?? 'Checking…')}
          </Text>
          <View style={styles.balanceMetaRow}>
            <Text style={styles.network}>Tempo Moderato · test funds</Text>
            {!uiPreviewEnabled && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh balance"
                accessibilityState={{
                  disabled: balance.isFetching || wallet.busy,
                }}
                disabled={balance.isFetching || wallet.busy}
                onPress={() => void balance.refetch()}
                style={[
                  styles.refresh,
                  (balance.isFetching || wallet.busy) && styles.disabledAction,
                ]}
              >
                <Text style={styles.refreshText}>
                  {balance.isFetching ? 'Refreshing…' : 'Refresh'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
        {!uiPreviewEnabled && balance.isError && (
          <Text accessibilityRole="alert" style={ui.error}>
            Could not read your balance. {walletError(balance.error)} Use
            Refresh to retry.
          </Text>
        )}
        {notice?.address === address && (
          <Text accessibilityLiveRegion="polite" style={ui.caption}>
            {notice?.text}
          </Text>
        )}
        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan and pay"
            accessibilityState={{ disabled: navigatingDisabled }}
            disabled={navigatingDisabled}
            onPress={() => router.push('/scanner')}
            style={[
              styles.quickAction,
              navigatingDisabled && styles.disabledAction,
            ]}
          >
            <View style={styles.quickIcon}>
              <ScanIcon color="#fff" size={25} />
            </View>
            <Text style={styles.quickTitle}>Scan & Pay</Text>
            <Text style={styles.quickHint}>Pay anywhere</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send to contacts"
            onPress={() => router.push('/payments')}
            style={[styles.quickAction, styles.quickDivider]}
          >
            <View style={styles.quickIconSoft}>
              <AppIcon name="send" color={colors.accent} />
            </View>
            <Text style={styles.quickTitle}>Send</Text>
            <Text style={styles.quickHint}>To contacts</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Receive funds"
            onPress={() =>
              router.push({
                pathname: '/payments',
                params: { mode: 'receive' },
              })
            }
            style={[styles.quickAction, styles.quickDivider]}
          >
            <View style={styles.quickIconSoft}>
              <AppIcon name="person" color={colors.accent} />
            </View>
            <Text style={styles.quickTitle}>Receive</Text>
            <Text style={styles.quickHint}>Get paid</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: fundingUnavailable }}
            disabled={fundingUnavailable}
            onPress={() =>
              uiPreviewEnabled ? router.push('/add-money') : void fund()
            }
            style={[
              styles.quickAction,
              styles.quickDivider,
              fundingUnavailable && styles.disabledAction,
            ]}
          >
            <View style={styles.quickIconSoft}>
              <AppIcon name="plus" color={colors.accent} />
            </View>
            <Text style={styles.quickTitle}>
              {funding
                ? 'Requesting…'
                : cooldown
                  ? `Wait ${cooldown}s`
                  : 'Add Money'}
            </Text>
            <Text style={styles.quickHint}>
              {uiPreviewEnabled ? 'Design preview' : 'Test faucet'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan and pay across India"
          accessibilityState={{ disabled: navigatingDisabled }}
          disabled={navigatingDisabled}
          onPress={() => router.push('/scanner')}
          style={[styles.banner, navigatingDisabled && styles.disabledAction]}
        >
          <Image
            source={merchantBanner}
            resizeMode="cover"
            style={styles.bannerImage}
          />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>Scan a merchant QR</Text>
            <Text style={styles.bannerSub}>
              Review UPI details before you pay.
            </Text>
            <Text style={styles.bannerLink}>Open scanner →</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="This month: spending, payments, and network fees are not available yet. View activity."
          onPress={() => router.push('/activity')}
          style={styles.monthBar}
        >
          <View style={styles.monthHeading}>
            <View style={styles.chartIcon}>
              <View style={[styles.chartColumn, { height: 10 }]} />
              <View style={[styles.chartColumn, { height: 18 }]} />
              <View style={[styles.chartColumn, { height: 14 }]} />
            </View>
            <Text style={styles.monthTitle}>This Month</Text>
          </View>
          <View style={styles.monthMetric}>
            <Text style={styles.monthValue}>—</Text>
            <Text style={styles.monthLabel}>Spent</Text>
          </View>
          <View style={styles.monthMetric}>
            <Text style={styles.monthValue}>—</Text>
            <Text style={styles.monthLabel}>Payments</Text>
          </View>
          <View style={styles.monthMetric}>
            <Text style={styles.monthValue}>—</Text>
            <Text style={styles.monthLabel}>Network fees</Text>
          </View>
          <AppIcon name="arrow" size={14} color={colors.muted} />
        </Pressable>
        <View style={styles.activitySection}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/activity')}
              style={styles.seeAll}
            >
              <Text style={styles.link}>See All ›</Text>
            </Pressable>
          </View>
          <View style={styles.emptyActivity}>
            <AppIcon name="activity" color={colors.accent} size={30} />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyCopy}>
              Your transactions will appear here when payments are available.
            </Text>
          </View>
        </View>
        {uiPreviewEnabled && (
          <Action
            secondary
            title="Review sample payment"
            onPress={() =>
              router.push({
                pathname: '/confirmation',
                params: {
                  merchantName: 'Sample merchant',
                  merchantVpa: 'sample@upi',
                  inrAmount: '250',
                },
              })
            }
          />
        )}
        <Text style={styles.disclosure}>
          Tempo testnet · pathUSD has no monetary value. INR settlement is
          simulated.
        </Text>
      </ScrollView>
      <DashboardNav disabled={navigatingDisabled} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: { flexShrink: 1 },
  greeting: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  subGreeting: { color: colors.muted, fontSize: 13, marginTop: 3 },
  badge: {
    backgroundColor: '#e9f2ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  balance: {
    backgroundColor: '#002967',
    borderRadius: 17,
    padding: 18,
    gap: 8,
  },
  balanceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: { color: '#d9e9ff', fontSize: 14 },
  token: { color: '#fff', fontSize: 13, fontWeight: '700' },
  amount: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  network: { color: '#c4d8ff', fontSize: 12, flexShrink: 1 },
  refresh: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  refreshText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 17,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  disabledAction: { opacity: 0.5 },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    minHeight: 78,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  quickDivider: { borderLeftWidth: 1, borderLeftColor: '#dce8ff' },
  quickIcon: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconSoft: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#e0efff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickHint: { color: colors.muted, fontSize: 9, textAlign: 'center' },
  banner: {
    width: '100%',
    height: 116,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ebeeff',
  },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerCopy: {
    width: '51%',
    height: '100%',
    backgroundColor: '#ebeeff',
    padding: 12,
    justifyContent: 'center',
    gap: 5,
  },
  bannerTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  bannerSub: { color: colors.muted, fontSize: 11 },
  bannerLink: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  activitySection: { gap: 8 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6ea4ff',
    backgroundColor: '#fff',
  },
  monthHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1.4,
    minWidth: 0,
  },
  chartIcon: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    padding: 3,
    backgroundColor: '#e8f4ff',
    borderRadius: 5,
  },
  chartColumn: { width: 3, borderRadius: 2, backgroundColor: '#0088ff' },
  monthTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  monthMetric: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#dce8ff',
    paddingLeft: 6,
    gap: 2,
  },
  monthValue: { fontSize: 13, fontWeight: '700', color: colors.ink },
  monthLabel: { fontSize: 9, color: colors.muted },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  seeAll: { minHeight: 48, justifyContent: 'center', paddingLeft: 12 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  emptyActivity: {
    borderRadius: 16,
    backgroundColor: '#f4f8ff',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 5,
  },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  disclosure: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
