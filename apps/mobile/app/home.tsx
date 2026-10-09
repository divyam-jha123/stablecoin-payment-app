import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Action,
  AppIcon,
  colors,
  PaymentScreen,
  ui,
} from '../src/components/payment-ui';
import { rememberedAccount } from '../src/features/account/remembered-account';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { previewDashboardWith } from '../src/preview-data';
import { PreviewTransactions } from '../src/components/preview-transactions';
import { uiPreviewEnabled } from '../src/ui-preview';
import { HomeBalanceCard } from '../src/components/home-balance-card';
import { HomeQuickActions } from '../src/components/home-quick-actions';
import { HomeGreeting } from '../src/components/home-greeting';
import { HomeAdCarousel } from '../src/components/home-ad-carousel';
import { homeTheme } from '../src/theme/home';
import { DashboardNav } from '../src/components/dashboard-nav';
import { openPinSettings } from '../src/features/account/open-pin-settings';
import { walletFlowLog } from '../src/features/account/wallet-flow-log';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  simulatedBalance,
  toTransactionItem,
} from '../src/features/payment/simulated-payments';

// Metro bundles this static Figma asset at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const merchantBanner = require('../assets/figma/home-merchant-banner.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pinAd = require('../assets/ads/pin-ad.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const historyAd = require('../assets/ads/history-ad.png');

export default function Home() {
  const { wallet, onTempo, session, foreground } = useAccount();
  const address = wallet.account?.address;
  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  const previewDashboard = previewDashboardWith(payments);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthPayments = payments.filter(
    (payment) => payment.createdAt >= monthStart.getTime(),
  );
  const monthSpent = `₹${monthPayments
    .reduce((total, payment) => total + Number(payment.inrAmount), 0)
    .toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setBalanceVisible(false);
      return () => setBalanceVisible(false);
    }, []),
  );
  useEffect(() => {
    setBalanceVisible(false);
  }, [address]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setBalanceVisible(false);
    });
    return () => subscription.remove();
  }, []);
  const [funding, setFunding] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{
    address: string;
    text: string;
  } | null>(null);
  const fundingLock = useRef(false);
  const authorized =
    uiPreviewEnabled ||
    Boolean(
      address &&
      onTempo &&
      // The traveller signed in on this phone proved their wallet at first
      // sign-in; they never see the login page again.
      (session.data === true || rememberedAccount.is(address)),
    );
  const dashboardLogged = useRef(false);
  useEffect(() => {
    if (
      !uiPreviewEnabled &&
      authorized &&
      foreground &&
      !dashboardLogged.current
    ) {
      dashboardLogged.current = true;
      walletFlowLog.info('Dashboard opened with an authenticated Tempo wallet');
      walletFlowLog.stop();
    }
  }, [authorized, foreground]);
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

  const paymentActions = {
    onAddMoney: () =>
      uiPreviewEnabled ? router.push('/add-money') : void fund(),
    onSend: () => router.push('/payments'),
    onReceive: () => router.push('/receive'),
    disabled: navigatingDisabled,
    fundingDisabled: fundingUnavailable,
    fundingLabel: funding
      ? 'Requesting…'
      : cooldown
        ? `Wait ${cooldown}s`
        : 'Add Money',
  };

  // On launch, wait for MetaMask or the remembered traveller before deciding.
  if (
    !uiPreviewEnabled &&
    wallet.restored &&
    (!address ||
      !onTempo ||
      (!rememberedAccount.is(address) &&
        (session.data === false || session.isError)))
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
        <HomeGreeting
          name={uiPreviewEnabled ? 'Rupesh' : 'traveller'}
          unread={uiPreviewEnabled}
          onProfile={() => router.push('/profile')}
          onNotifications={() => setNotificationsOpen(true)}
        />
        <HomeBalanceCard
          {...paymentActions}
          balance={
            uiPreviewEnabled
              ? previewDashboard.displayBalance
              : balance.isError
                ? 'Unavailable'
                : balance.data === undefined
                  ? 'Checking…'
                  : simulatedBalance(balance.data, payments)
          }
          equivalent={
            uiPreviewEnabled
              ? previewDashboard.displayEquivalent
              : 'Tempo Moderato · test funds'
          }
          currency={uiPreviewEnabled ? 'USDC' : 'pathUSD'}
          visible={balanceVisible}
          onToggleVisibility={() => setBalanceVisible((visible) => !visible)}
          onCurrencyPress={() =>
            Alert.alert(
              'Currency',
              uiPreviewEnabled
                ? 'USDC is selected for this design preview. Currency switching is not available yet.'
                : 'This wallet uses pathUSD on Tempo Moderato testnet.',
            )
          }
          onActivity={() => router.push('/activity')}
          monthlyChange={uiPreviewEnabled ? '12.4%' : undefined}
        />
        {!uiPreviewEnabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh balance"
            accessibilityState={{ disabled: balance.isFetching || wallet.busy }}
            disabled={balance.isFetching || wallet.busy}
            onPress={() => void balance.refetch()}
            style={styles.refresh}
          >
            <Text style={styles.link}>
              {balance.isFetching ? 'Refreshing…' : 'Refresh balance'}
            </Text>
          </Pressable>
        )}
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
        <View style={uiPreviewEnabled ? styles.quickActionsSpacing : undefined}>
          <HomeQuickActions
            {...paymentActions}
            onScan={() => router.push('/scanner')}
            fundingHint={uiPreviewEnabled ? 'From bank' : 'Test faucet'}
          />
        </View>
        <HomeAdCarousel
          disabled={navigatingDisabled}
          ads={[
            {
              key: 'scan',
              accessibilityLabel: 'Scan and pay across India',
              onPress: () => router.push('/scanner'),
              content: (
                <>
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
                </>
              ),
            },
            {
              key: 'pin',
              accessibilityLabel:
                'Your PIN. Your payments. Set a 4-digit PIN to approve your TravelPe payments.',
              onPress: () => void openPinSettings(),
              content: (
                <Image
                  source={pinAd}
                  resizeMode="cover"
                  style={styles.bannerImage}
                />
              ),
            },
            {
              key: 'history',
              accessibilityLabel:
                'Every payment, in one place. View your TravelPe payment history.',
              onPress: () => router.push('/activity'),
              content: (
                <Image
                  source={historyAd}
                  resizeMode="cover"
                  style={styles.bannerImage}
                />
              ),
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            uiPreviewEnabled
              ? `Sample monthly activity: ${previewDashboard.spent} spent, ${previewDashboard.payments} payments, ${previewDashboard.networkFees} pathUSD network fees. View activity.`
              : `This month: ${monthSpent} spent, ${monthPayments.length} payments. View activity.`
          }
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
            <Text style={styles.monthValue}>
              {uiPreviewEnabled ? previewDashboard.spent : monthSpent}
            </Text>
            <Text style={styles.monthLabel}>Spent</Text>
          </View>
          <View style={styles.monthMetric}>
            <Text style={styles.monthValue}>
              {uiPreviewEnabled
                ? previewDashboard.payments
                : monthPayments.length}
            </Text>
            <Text style={styles.monthLabel}>Payments</Text>
          </View>
          <View style={styles.monthMetric}>
            <Text style={styles.monthValue}>
              {uiPreviewEnabled ? previewDashboard.networkFees : '—'}
            </Text>
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
          {uiPreviewEnabled ? (
            <PreviewTransactions
              transactions={previewDashboard.transactions.slice(0, 3)}
            />
          ) : payments.length > 0 ? (
            <PreviewTransactions
              transactions={payments.slice(0, 3).map(toTransactionItem)}
            />
          ) : (
            <View style={styles.emptyActivity}>
              <AppIcon name="activity" color={colors.accent} size={30} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyCopy}>
                Your transactions will appear here after you pay a merchant.
              </Text>
            </View>
          )}
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
                },
              })
            }
          />
        )}
        <Text style={styles.disclosure}>
          {uiPreviewEnabled
            ? 'Sample data for design preview only. No funds moved.'
            : 'Tempo testnet · pathUSD has no monetary value. INR settlement is simulated.'}
        </Text>
      </ScrollView>
      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.notificationPanel} accessibilityViewIsModal>
            <AppIcon name="bell" size={32} color={colors.accent} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Notifications
            </Text>
            <Text style={styles.emptyCopy}>
              {uiPreviewEnabled
                ? 'No sample notifications yet.'
                : 'Notifications are not available yet.'}
            </Text>
            <Action title="Close" onPress={() => setNotificationsOpen(false)} />
          </View>
        </View>
      </Modal>
      <View style={styles.navArea}>
        <DashboardNav disabled={navigatingDisabled} floating />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: homeTheme.colors.background },
  scroll: { flex: 1, backgroundColor: homeTheme.colors.background },
  content: {
    width: '100%',
    maxWidth: homeTheme.layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingTop: homeTheme.spacing.sm,
    paddingBottom: homeTheme.spacing.section,
    gap: homeTheme.spacing.lg,
  },
  quickActionsSpacing: { marginTop: -28 },
  navArea: {
    backgroundColor: homeTheme.colors.background,
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingBottom: homeTheme.spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,19,50,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  notificationPanel: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  refresh: {
    minHeight: homeTheme.layout.touchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-end',
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
