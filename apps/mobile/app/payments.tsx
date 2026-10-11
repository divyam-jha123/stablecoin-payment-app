import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardNav } from '../src/components/dashboard-nav';
import { AppIcon, colors, ScanIcon, ui } from '../src/components/payment-ui';
import { PaymentsWalletCard } from '../src/components/payments-wallet-card';
import { PaymentRow } from '../src/components/payment-row';
import {
  HomeTokenSheet,
  type HomeTokenOption,
} from '../src/components/home-token-sheet';
import { useAccount } from '../src/features/account/use-account';
import { useTestFunding } from '../src/features/account/use-test-funding';
import { tempoService } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import { simulatedBalance } from '../src/features/payment/simulated-payments';
import { activityItems } from '../src/features/payment/received-transfers';
import { useReceivedTransfers } from '../src/features/payment/received-transfers-store';
import {
  CurrencyTiles,
  type CurrencyHolding,
} from '../src/components/currency-tiles';
import {
  previewDashboardWith,
  previewInrHolding,
  previewUsdt,
  previewReceiptPayments,
} from '../src/preview-data';
import { homeTheme as theme } from '../src/theme/home';
import { uiPreviewEnabled } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

export default function Payments() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { wallet, onTempo, foreground } = useAccount();
  const address = wallet.account?.address;
  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  // Wallet mode lists real testnet pathUSD received next to sent payments.
  const received = useReceivedTransfers(uiPreviewEnabled ? null : address);
  const previewDashboard = previewDashboardWith(payments);
  // Sent rows open the full history with that person or merchant.
  const sentPayments = uiPreviewEnabled
    ? [...payments, ...previewReceiptPayments]
    : payments;
  function openHistory(id: string) {
    const payment = sentPayments.find((item) => item.id === id);
    if (!payment) return;
    router.push({
      pathname: '/recipient',
      params: {
        name: payment.merchantName,
        ...(payment.merchantVpa ? { vpa: payment.merchantVpa } : {}),
      },
    });
  }
  // Shares the Home query key, so switching tabs reuses the cached balance.
  const balance = useQuery({
    queryKey: ['tempo-pathUSD', address, wallet.account?.chainId],
    queryFn: () => tempoService.balance(address!),
    enabled:
      !uiPreviewEnabled && Boolean(address) && foreground && !wallet.busy,
    retry: false,
    staleTime: 0,
    refetchInterval: foreground ? 15_000 : false,
  });
  const disabled = wallet.busy;
  // Preview opens the Add Money design; wallet mode requests testnet funds.
  const testFunding = useTestFunding({
    address,
    enabled: !uiPreviewEnabled && onTempo,
    refetch: balance.refetch,
  });
  const liveBalance = !address
    ? '—'
    : balance.isError
      ? 'Unavailable'
      : balance.data === undefined
        ? 'Checking…'
        : simulatedBalance(balance.data, payments);
  // Wallet mode reads only pathUSD; other tokens and INR show a dash until the
  // app can read them, never a sample number.
  const holdings: CurrencyHolding[] = uiPreviewEnabled
    ? [
        {
          symbol: 'USDC',
          amount: previewDashboard.tokenAmount,
          detail: `≈ ${previewDashboard.displayBalance}`,
        },
        {
          symbol: 'USDT',
          amount: previewUsdt.tokenAmount,
          detail: `≈ ${previewUsdt.displayBalance}`,
        },
        { symbol: 'INR', amount: previewInrHolding, detail: 'Indian Rupee' },
      ]
    : [
        { symbol: 'pathUSD', amount: liveBalance, detail: 'Tempo testnet' },
        { symbol: 'USDC', amount: '—', detail: 'Not available yet' },
        { symbol: 'USDT', amount: '—', detail: 'Not available yet' },
        { symbol: 'INR', amount: '—', detail: 'Indian Rupee' },
      ];
  // Same choices as the Home currency switcher. Wallet mode reads only
  // pathUSD, so USDC and USDT show a dash instead of a sample number.
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
          balance:
            balance.data === undefined || balance.isError || !address
              ? liveBalance
              : `${liveBalance} pathUSD`,
          equivalent: address
            ? 'Tempo testnet · MetaMask connected'
            : 'Connect MetaMask to see your balance',
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
  const [tokenSymbol, setTokenSymbol] = useState(
    uiPreviewEnabled ? 'USDC' : 'pathUSD',
  );
  const [tokenSheetOpen, setTokenSheetOpen] = useState(false);
  const selectedToken =
    tokenOptions.find((option) => option.symbol === tokenSymbol) ??
    tokenOptions[0]!;
  const recent = (
    uiPreviewEnabled
      ? previewDashboard.transactions
      : activityItems(payments, received)
  ).slice(0, 3);

  if (mode === 'receive') return <Redirect href="/receive" />;

  const quickActions = [
    {
      key: 'scan',
      title: 'Scan QR',
      icon: null,
      onPress: () => router.push('/scanner'),
    },
    {
      key: 'add-money',
      title: testFunding.label ?? 'Add Money',
      icon: 'card-plus',
      onPress: () =>
        uiPreviewEnabled ? router.push('/add-money') : void testFunding.fund(),
      unavailable:
        !uiPreviewEnabled &&
        (testFunding.funding || testFunding.cooldown > 0 || !onTempo),
    },
    {
      key: 'my-qr',
      title: 'My QR',
      icon: 'qr',
      // The receive screen opens on the traveller's own TravelPe QR.
      onPress: () => router.push('/receive'),
    },
    {
      key: 'receive',
      title: 'Receive',
      icon: 'download',
      onPress: () => router.push('/receive'),
    },
    {
      key: 'global',
      title: 'Global Pay',
      icon: 'globe',
      onPress: () =>
        Alert.alert(
          'Global Pay',
          'Paying merchants outside India is coming soon.',
        ),
    },
  ] as const;

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Payments
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Payment settings"
            onPress={() => router.push('/payment-methods')}
            hitSlop={8}
            style={({ pressed }) => [styles.settings, pressed && ui.pressed]}
          >
            <AppIcon name="settings" color={tc(colors.ink)} size={24} />
          </Pressable>
        </View>
        <PaymentsWalletCard
          balance={selectedToken.balance}
          equivalent={selectedToken.equivalent}
          token={selectedToken.symbol}
          gasless={uiPreviewEnabled || onTempo}
          disabled={disabled}
          onTokenPress={() => setTokenSheetOpen(true)}
          onScanPay={() => router.push('/scanner')}
        />
        {!uiPreviewEnabled && balance.isError && (
          <Text accessibilityRole="alert" style={ui.error}>
            Could not read your balance. {walletError(balance.error)}
          </Text>
        )}
        {testFunding.notice && (
          <Text accessibilityLiveRegion="polite" style={ui.caption}>
            {testFunding.notice}
          </Text>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actions}>
            {quickActions.map((action) => {
              const off =
                disabled || ('unavailable' in action && action.unavailable);
              return (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  accessibilityState={{ disabled: off }}
                  disabled={off}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.action,
                    off && ui.disabled,
                    pressed && ui.pressed,
                  ]}
                >
                  {action.icon ? (
                    <AppIcon
                      name={action.icon}
                      color={tc(theme.colors.primary)}
                      size={24}
                    />
                  ) : (
                    <ScanIcon color={tc(theme.colors.primary)} size={24} />
                  )}
                  <Text style={styles.actionTitle} numberOfLines={2}>
                    {action.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <CurrencyTiles
          holdings={holdings}
          onManage={() => router.push('/payment-methods')}
        />
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent payments</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all payments"
              onPress={() => router.push('/activity')}
              style={styles.viewAll}
            >
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </View>
          {recent.length > 0 ? (
            <View style={styles.list}>
              {recent.map((transaction) => (
                <PaymentRow
                  key={transaction.id}
                  transaction={transaction}
                  // Money received has no recipient history to open.
                  onPress={
                    transaction.direction === 'Sent'
                      ? () => openHistory(transaction.id)
                      : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <AppIcon name="activity" color={tc(colors.accent)} size={30} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyCopy}>
                Your payments will appear here after you pay or get paid.
              </Text>
            </View>
          )}
        </View>
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
          setTokenSymbol(symbol);
          setTokenSheetOpen(false);
        }}
        onClose={() => setTokenSheetOpen(false)}
      />
      <View style={styles.navArea}>
        <DashboardNav disabled={disabled} floating />
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    width: '100%',
    maxWidth: theme.layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: theme.layout.pageGutter,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.section,
    gap: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
  },
  settings: {
    width: theme.layout.touchTarget,
    height: theme.layout.touchTarget,
    borderRadius: theme.radius.pill,
    backgroundColor: '#eef3fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: theme.spacing.md },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xs,
  },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  viewAll: {
    minHeight: theme.layout.touchTarget,
    justifyContent: 'center',
    paddingLeft: theme.spacing.md,
  },
  link: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  list: { gap: theme.spacing.md },
  empty: {
    borderRadius: theme.radius.surface,
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
  navArea: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.layout.pageGutter,
    paddingBottom: theme.spacing.sm,
  },
});
