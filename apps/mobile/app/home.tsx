import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  AppState,
  Pressable,
  ScrollView,
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
import { useWalletSignedIn } from '../src/features/account/use-wallet-signed-in';
import { useAccount } from '../src/features/account/use-account';
import { walletStore } from '../src/features/account/metamask';
import { TEMPO_CHAIN, tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import {
  previewDashboardWith,
  previewRecipients,
  previewUsdt,
} from '../src/preview-data';
import { PreviewTransactions } from '../src/components/preview-transactions';
import { uiPreviewEnabled } from '../src/ui-preview';
import { HomeBalanceCard } from '../src/components/home-balance-card';
import {
  HomeTokenSheet,
  type HomeTokenOption,
} from '../src/components/home-token-sheet';
import { HomeQuickActions } from '../src/components/home-quick-actions';
import { HomeSearchBar } from '../src/components/home-search-bar';
import { HomeMonthSummary } from '../src/components/home-month-summary';
import { HomeGreeting } from '../src/components/home-greeting';
import { HomeConnectWalletCard } from '../src/components/home-connect-wallet-card';
import {
  connectStatusText,
  useWalletSignIn,
} from '../src/features/account/use-wallet-sign-in';
import { useExplorer } from '../src/features/account/use-explorer';
import { useProfileDetails } from '../src/features/account/profile-details-store';
import { HomeAdCarousel } from '../src/components/home-ad-carousel';
import { homeTheme } from '../src/theme/home';
import { DashboardNav } from '../src/components/dashboard-nav';
import { openPinSettings } from '../src/features/account/open-pin-settings';
import { walletFlowLog } from '../src/features/account/wallet-flow-log';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import { activityItems } from '../src/features/payment/received-transfers';
import { useReceivedTransfers } from '../src/features/payment/received-transfers-store';
import { useNotifications } from '../src/features/notifications/notification-store';
import {
  recentRecipients,
  simulatedBalance,
} from '../src/features/payment/simulated-payments';
import { RecentRecipients } from '../src/components/recent-recipients';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

// Metro bundles this static Figma asset at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const merchantBanner = require('../assets/figma/home-merchant-banner.webp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pinAd = require('../assets/ads/pin-ad.webp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const historyAd = require('../assets/ads/history-ad.webp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rewardsAd = require('../assets/ads/rewards-ad.webp');

export default function Home() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const { wallet, onTempo, session, foreground } = useAccount();
  const address = wallet.account?.address;
  const {
    profile: googleProfile,
    loaded: googleLoaded,
    explorer,
  } = useExplorer();
  const profileDetails = useProfileDetails(address);
  const displayName =
    profileDetails?.name || googleProfile?.name || 'Traveller';
  // Google-only travellers connect MetaMask from here, never via onboarding.
  const connecting = useWalletSignIn({
    onDone: () => {},
  });
  const connectWallet = connecting.signIn;
  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  // Wallet mode lists real testnet pathUSD received next to sent payments.
  const received = useReceivedTransfers(uiPreviewEnabled ? null : address);
  const recentActivity = activityItems(payments, received);
  const { unreadCount: unreadNotifications } = useNotifications(address);
  const previewDashboard = previewDashboardWith(payments);
  // Hidden until the traveller's first payment; the preview shows samples.
  const recipients = uiPreviewEnabled
    ? previewRecipients
    : recentRecipients(payments);
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
  const [homeToken, setHomeToken] = useState(
    uiPreviewEnabled ? 'USDC' : 'pathUSD',
  );
  const [tokenSheetOpen, setTokenSheetOpen] = useState(false);
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
  // The traveller signed in on this phone proved their wallet at first
  // sign-in; they never see the login page again.
  const walletSignedIn = useWalletSignedIn({ wallet, onTempo, session });
  const authorized = uiPreviewEnabled || explorer || walletSignedIn;
  // Connecting MetaMask from Home: a Google-signed-in traveller stays here
  // (with the connect card) until the wallet is verified, never on login.
  const connectingWallet =
    !uiPreviewEnabled && Boolean(googleProfile) && !authorized;
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
    enabled:
      !uiPreviewEnabled &&
      Boolean(address) &&
      authorized &&
      foreground &&
      !wallet.busy,
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
        text: 'Test funds requested. Your balance updates automatically.',
      });
      if (walletStore.getSnapshot().account?.address === address)
        await balance.refetch();
    } catch (cause) {
      setNotice({
        address,
        text: walletError(cause) + ' Please try again after the cooldown.',
      });
    } finally {
      fundingLock.current = false;
      setFunding(false);
    }
  }

  const liveBalance = balance.isError
    ? 'Unavailable'
    : balance.data === undefined
      ? 'Checking…'
      : simulatedBalance(balance.data, payments);
  // Wallet mode reads only pathUSD; USDC and USDT show a dash until the app
  // can read their balances, never a sample number.
  const tokenOptions: (HomeTokenOption & {
    balance: string;
    equivalent: string;
  })[] = uiPreviewEnabled
    ? [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          amount: previewDashboard.tokenAmount,
          detail: previewDashboard.displayBalance,
          balance: previewDashboard.displayBalance,
          equivalent: previewDashboard.displayEquivalent,
        },
        {
          symbol: 'USDT',
          name: 'Tether',
          amount: previewUsdt.tokenAmount,
          detail: previewUsdt.displayBalance,
          balance: previewUsdt.displayBalance,
          equivalent: previewUsdt.displayEquivalent,
        },
      ]
    : [
        {
          symbol: 'pathUSD',
          name: 'Path USD',
          amount: liveBalance,
          detail: 'Tempo testnet',
          balance: liveBalance,
          equivalent: 'Tempo Moderato · test funds',
        },
        ...(['USDC', 'USDT'] as const).map((symbol) => ({
          symbol,
          name: symbol === 'USDC' ? 'USD Coin' : 'Tether',
          amount: '—',
          detail: 'Not available yet',
          balance: '—',
          equivalent: `${symbol} balance not available yet`,
        })),
      ];
  const selectedToken =
    tokenOptions.find((option) => option.symbol === homeToken) ??
    tokenOptions[0]!;

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
    googleLoaded &&
    !explorer &&
    !connectingWallet &&
    (!address ||
      !onTempo ||
      (!walletSignedIn && (session.data === false || session.isError)))
  )
    return <Redirect href="/connect" />;
  if (!authorized && !connectingWallet)
    return (
      <PaymentScreen>
        <ActivityIndicator color={tc(colors.ink)} />
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
          name={displayName}
          photoUri={profileDetails?.photoUri ?? null}
          unread={unreadNotifications > 0}
          onProfile={() => router.push('/profile')}
          onNotifications={() => router.push('/notifications')}
        />
        {explorer || connectingWallet ? (
          <HomeConnectWalletCard
            onConnect={() => void connectWallet()}
            busy={connecting.busy}
            status={connectStatusText(connecting.stage)}
            error={connecting.error}
          />
        ) : (
          <>
            <HomeBalanceCard
              balance={selectedToken.balance}
              equivalent={selectedToken.equivalent}
              currency={selectedToken.symbol}
              visible={balanceVisible}
              onToggleVisibility={() =>
                setBalanceVisible((visible) => !visible)
              }
              onCurrencyPress={() => setTokenSheetOpen(true)}
              gasless={uiPreviewEnabled || onTempo}
              // Only a signed-in MetaMask wallet; the preview mirrors one.
              onWallet={
                uiPreviewEnabled || (address && walletSignedIn)
                  ? () => router.push('/profile')
                  : undefined
              }
              monthlyChange={uiPreviewEnabled ? '12.4%' : undefined}
            />
            {!uiPreviewEnabled && balance.isError && (
              <Text accessibilityRole="alert" style={ui.error}>
                Could not read your balance. {walletError(balance.error)} Check
                your connection; your balance updates automatically.
              </Text>
            )}
            {notice && notice.address === address && (
              <Text accessibilityLiveRegion="polite" style={ui.caption}>
                {notice.text}
              </Text>
            )}
            <HomeSearchBar
              disabled={navigatingDisabled}
              onPress={() => router.push('/search')}
              onVoice={() =>
                router.push({ pathname: '/search', params: { voice: '1' } })
              }
            />
            <HomeQuickActions
              {...paymentActions}
              onScan={() => router.push('/scanner')}
              fundingLabel={
                funding
                  ? 'Requesting…'
                  : cooldown
                    ? `Wait ${cooldown}s`
                    : 'Top Up'
              }
            />
          </>
        )}
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
              onPress: () =>
                explorer ? void connectWallet() : void openPinSettings(),
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
            {
              key: 'rewards',
              accessibilityLabel:
                'TravelPe Rewards. Earn on every payment: cashback, exclusive offers and travel benefits.',
              // There is no rewards programme yet, so the banner says so.
              onPress: () =>
                Alert.alert(
                  'TravelPe Rewards',
                  'Rewards are coming soon. No cashback is earned yet.',
                ),
              content: (
                <Image
                  source={rewardsAd}
                  resizeMode="cover"
                  style={styles.bannerImage}
                />
              ),
            },
          ]}
        />
        <HomeMonthSummary
          spent={uiPreviewEnabled ? previewDashboard.spent : monthSpent}
          payments={
            uiPreviewEnabled ? previewDashboard.payments : monthPayments.length
          }
          // Fees are not tracked for live payments yet, so wallet mode shows a dash.
          fees={uiPreviewEnabled ? `${previewDashboard.networkFees} USDC` : '—'}
          saved={uiPreviewEnabled ? previewDashboard.feesSaved : undefined}
          onPress={() => router.push('/activity')}
        />
        {recipients.length > 0 && (
          <RecentRecipients
            recipients={recipients}
            disabled={navigatingDisabled}
            onRecipient={(recipient) =>
              router.push({
                pathname: '/recipient',
                params: {
                  name: recipient.name,
                  ...(recipient.vpa ? { vpa: recipient.vpa } : {}),
                },
              })
            }
            onViewAll={() => router.push('/activity')}
            onPayNew={() => router.push('/scanner')}
          />
        )}
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
          ) : recentActivity.length > 0 ? (
            <PreviewTransactions transactions={recentActivity.slice(0, 3)} />
          ) : (
            <View style={styles.emptyActivity}>
              <AppIcon name="activity" color={tc(colors.accent)} size={30} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyCopy}>
                Your transactions will appear here after you pay or get paid.
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
      <HomeTokenSheet
        visible={tokenSheetOpen}
        options={tokenOptions}
        selected={selectedToken.symbol}
        onSelect={(symbol) => {
          setHomeToken(symbol);
          setTokenSheetOpen(false);
        }}
        onClose={() => setTokenSheetOpen(false)}
      />
      <View style={styles.navArea}>
        <DashboardNav disabled={navigatingDisabled} floating />
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
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
  navArea: {
    backgroundColor: homeTheme.colors.background,
    paddingHorizontal: homeTheme.layout.pageGutter,
    paddingBottom: homeTheme.spacing.sm,
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
