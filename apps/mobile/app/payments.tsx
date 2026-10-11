import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardNav } from '../src/components/dashboard-nav';
import { MerchantCard } from '../src/components/merchant-card';
import { AppIcon, colors, ui } from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  favouriteMerchantStore,
  useFavouriteMerchants,
} from '../src/features/payment/favourite-merchants-store';
import {
  merchantSortLabels,
  merchantSummaries,
  nextMerchantSort,
  visibleMerchants,
  type MerchantFilter,
  type MerchantSort,
} from '../src/features/payment/merchants';
import { PREVIEW_PROFILE_OWNER } from '../src/features/account/profile-details';
import {
  previewMerchantDetails,
  previewReceiptPayments,
} from '../src/preview-data';
import { homeTheme as theme } from '../src/theme/home';
import { uiPreviewEnabled } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const filters: readonly { key: MerchantFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'recent', label: 'Recent' },
  { key: 'favourites', label: 'Favourites' },
];

export default function Payments() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { wallet } = useAccount();
  const address = wallet.account?.address;
  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  // Preview adds the sample merchants; wallet mode lists only payments made
  // from this wallet on this device.
  const sentPayments = useMemo(
    () =>
      uiPreviewEnabled ? [...payments, ...previewReceiptPayments] : payments,
    [payments],
  );
  const merchants = useMemo(
    () => merchantSummaries(sentPayments),
    [sentPayments],
  );
  const owner = uiPreviewEnabled ? PREVIEW_PROFILE_OWNER : address;
  const favourites = useFavouriteMerchants(owner);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MerchantFilter>('all');
  const [sort, setSort] = useState<MerchantSort>('recent');
  const searchInput = useRef<TextInput>(null);
  const shown = visibleMerchants(merchants, {
    query,
    filter,
    sort,
    favourites,
  });
  const disabled = wallet.busy;
  const connected = uiPreviewEnabled || Boolean(address);

  if (mode === 'receive') return <Redirect href="/receive" />;

  const emptyCopy = !connected
    ? {
        title: 'Connect your wallet',
        body: 'Merchants you pay will appear here.',
      }
    : merchants.length === 0
      ? {
          title: 'No merchants yet',
          body: 'Scan a UPI QR to pay your first merchant.',
        }
      : filter === 'favourites' && !query.trim()
        ? {
            title: 'No favourites yet',
            body: 'Tap the star on a merchant to keep them here.',
          }
        : {
            title: 'No matching merchants',
            body: 'Try another name or UPI ID.',
          };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>
              Payments
            </Text>
            <Text style={styles.subtitle}>
              Your merchants, all in one place
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search merchants"
            onPress={() => searchInput.current?.focus()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && ui.pressed,
            ]}
          >
            <AppIcon name="search" color={tc(theme.colors.primary)} size={26} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <AppIcon name="search" color={tc(theme.colors.muted)} size={22} />
          <TextInput
            ref={searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or UPI ID"
            placeholderTextColor={tc(theme.colors.muted)}
            accessibilityLabel="Search name or UPI ID"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            maxLength={80}
            style={styles.searchInput}
          />
        </View>

        <View accessibilityRole="tablist" style={styles.filters}>
          {filters.map((item) => {
            const selected = filter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item.key)}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && ui.pressed,
                ]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Your merchants
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sorted by ${merchantSortLabels[sort]}. Change sort order.`}
              onPress={() => setSort(nextMerchantSort(sort))}
              hitSlop={8}
              style={({ pressed }) => [
                styles.sortButton,
                pressed && ui.pressed,
              ]}
            >
              <Text style={styles.sortText}>{merchantSortLabels[sort]}</Text>
              <AppIcon name="sort" color={tc(theme.colors.muted)} size={20} />
            </Pressable>
          </View>
          {shown.length > 0 ? (
            <View style={styles.list}>
              {shown.map((merchant) => (
                <MerchantCard
                  key={merchant.key}
                  merchant={merchant}
                  detail={
                    (uiPreviewEnabled && merchant.vpa
                      ? previewMerchantDetails[merchant.vpa]
                      : undefined) ??
                    `${merchant.count} ${merchant.count === 1 ? 'payment' : 'payments'}`
                  }
                  favourite={favourites.has(merchant.key)}
                  disabled={disabled}
                  onPress={() =>
                    router.push({
                      pathname: '/recipient',
                      params: {
                        name: merchant.name,
                        ...(merchant.vpa ? { vpa: merchant.vpa } : {}),
                      },
                    })
                  }
                  onToggleFavourite={() =>
                    owner &&
                    favouriteMerchantStore.toggle(
                      owner.toLowerCase(),
                      merchant.key,
                    )
                  }
                />
              ))}
              <Text style={styles.hint}>
                Tap a merchant to view payment history
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <AppIcon name="store" color={tc(colors.accent)} size={30} />
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyCopy}>{emptyCopy.body}</Text>
            </View>
          )}
        </View>
        <Text style={styles.disclosure}>
          {uiPreviewEnabled
            ? 'Sample data for design preview only. No funds moved.'
            : 'Payments made from this wallet on this device. INR settlement is simulated.'}
        </Text>
      </ScrollView>
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
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
  },
  subtitle: { color: theme.colors.muted, fontSize: 16, lineHeight: 22 },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    backgroundColor: '#e8f1ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 52,
    borderRadius: theme.radius.surface,
    backgroundColor: '#f1f3f7',
    paddingHorizontal: theme.spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    paddingVertical: theme.spacing.md,
  },
  filters: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.lg + 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: { color: theme.colors.text, fontSize: 15, fontWeight: '500' },
  chipTextSelected: { color: '#ffffff', fontWeight: '600' },
  section: { gap: theme.spacing.md, marginTop: theme.spacing.xs },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: theme.layout.touchTarget,
    paddingLeft: theme.spacing.md,
  },
  sortText: { color: theme.colors.muted, fontSize: 14, fontWeight: '500' },
  list: { gap: theme.spacing.md },
  hint: {
    color: theme.colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
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
