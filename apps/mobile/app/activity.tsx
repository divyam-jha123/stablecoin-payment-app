import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fragment, useState, useSyncExternalStore } from 'react';
import Svg, { Path } from 'react-native-svg';
import { AppIcon, colors } from '../src/components/payment-ui';
import { DashboardNav } from '../src/components/dashboard-nav';

import { uiPreviewEnabled } from '../src/ui-preview';
import { previewDashboardWith, previewInr } from '../src/preview-data';
import { TransactionCard } from '../src/components/transaction-card';
import { walletStore } from '../src/features/account/metamask';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  toTransactionItem,
  type TransactionItem,
} from '../src/features/payment/simulated-payments';

const filters = ['All', 'Sent', 'Received', 'Travel', 'Bills'];

/** Groups transactions by their day label, keeping list order. */
function groupByDay(transactions: readonly TransactionItem[]) {
  const groups: { day: string; items: TransactionItem[] }[] = [];
  for (const transaction of transactions) {
    const day = transaction.time.split(' · ')[0] ?? '';
    const group = groups.find((item) => item.day === day);
    if (group) group.items.push(transaction);
    else groups.push({ day, items: [transaction] });
  }
  return groups;
}

export default function Activity() {
  // Opened from a notification, it can start on a filter such as Received.
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const initialFilter = Array.isArray(params.filter)
    ? params.filter[0]
    : params.filter;
  const [filter, setFilter] = useState(
    initialFilter && filters.includes(initialFilter) ? initialFilter : 'All',
  );
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const query = search.trim().toLowerCase();
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const payments = useSimulatedPayments(
    uiPreviewEnabled ? null : wallet.account?.address,
  );
  const source = uiPreviewEnabled
    ? previewDashboardWith(payments).transactions
    : payments.map(toTransactionItem);
  const transactions = source.filter(
    (transaction) =>
      (filter === 'All' ||
        transaction.direction === filter ||
        transaction.category === filter) &&
      `${transaction.name} ${transaction.category} ${transaction.amount} ${previewInr(transaction.amount)}`
        .toLowerCase()
        .includes(query),
  );
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.replace('/home')}
            style={styles.back}
          >
            <AppIcon name="chevron-left" />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Transactions
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtersOpen ? 'Hide filters' : 'Show filters'}
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen((open) => !open)}
            style={[styles.filterButton, filtersOpen && styles.filterButtonOn]}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path
                d="M4 5h16l-6 7.5V18l-4 2v-7.5z"
                stroke={colors.ink}
                strokeWidth={2}
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Search transactions"
          placeholder="Search by name, category or amount"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        {filtersOpen ? (
          <View style={styles.filters}>
            {filters.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === item }}
                onPress={() => setFilter(item)}
                style={[styles.filter, filter === item && styles.selected]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === item && styles.selectedText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {transactions.length > 0 ? (
          groupByDay(transactions).map((group) => (
            <Fragment key={group.day}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{group.day}</Text>
                <Text style={styles.count}>
                  {group.items.length}{' '}
                  {group.items.length === 1 ? 'transaction' : 'transactions'}
                </Text>
              </View>
              <View style={styles.list}>
                {group.items.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    // Sent payments open their receipt; money received has none.
                    onPress={
                      transaction.direction === 'Sent'
                        ? () =>
                            router.push({
                              pathname: '/receipt',
                              params: { id: transaction.id },
                            })
                        : undefined
                    }
                  />
                ))}
              </View>
            </Fragment>
          ))
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <AppIcon name="activity" color={colors.accent} size={34} />
            </View>
            <Text style={styles.emptyTitle}>
              {search || source.length > 0
                ? 'No matching transactions'
                : 'No transactions yet'}
            </Text>
            <Text style={styles.emptyText}>
              {search || source.length > 0
                ? 'Try another search term or filter.'
                : 'Your payment activity will appear here after you pay a merchant.'}
            </Text>
          </View>
        )}
        <Text style={styles.notice}>
          {uiPreviewEnabled
            ? 'Sample data for design preview only. No funds moved.'
            : 'Your test balance is read from Tempo Moderato.'}
        </Text>
      </ScrollView>
      <DashboardNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingTop: 14, gap: 20, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  back: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  filterButton: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: '#f2f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonOn: { backgroundColor: '#e6eefc' },
  search: {
    backgroundColor: '#edf2fd',
    borderRadius: 24,
    minHeight: 50,
    paddingHorizontal: 20,
    color: colors.ink,
    fontSize: 15,
    textAlign: 'center',
  },
  filters: { flexDirection: 'row', justifyContent: 'space-between', gap: 7 },
  filter: {
    backgroundColor: '#edf2fd',
    borderRadius: 12,
    minHeight: 46,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { backgroundColor: colors.accent },
  filterText: { color: colors.ink, fontSize: 14 },
  selectedText: { color: '#fff', fontWeight: '600' },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  list: { gap: 14, marginTop: -6 },
  empty: {
    flex: 1,
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 260,
  },
  notice: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
});
