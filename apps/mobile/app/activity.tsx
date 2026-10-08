import { router, Stack } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useSyncExternalStore } from 'react';
import { AppIcon, colors } from '../src/components/payment-ui';
import { DashboardNav } from '../src/components/dashboard-nav';

import { uiPreviewEnabled } from '../src/ui-preview';
import { previewInr, previewTransactions } from '../src/preview-data';
import { PreviewTransactions } from '../src/components/preview-transactions';
import { walletStore } from '../src/features/account/metamask';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import { toTransactionItem } from '../src/features/payment/simulated-payments';

const filters = ['All', 'Sent', 'Received', 'Travel', 'Bills'];

export default function Activity() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const payments = useSimulatedPayments(wallet.account?.address);
  const source = uiPreviewEnabled
    ? previewTransactions
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
            <AppIcon name="back" />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Transactions
          </Text>
          <View style={styles.headerSpace} />
        </View>
        <TextInput
          accessibilityLabel="Search transactions"
          placeholder="Search by name, category or amount"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {uiPreviewEnabled ? 'Sample activity' : 'Recent'}
          </Text>
          <Text style={styles.count}>
            {transactions.length}{' '}
            {transactions.length === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>
        {transactions.length > 0 ? (
          <PreviewTransactions transactions={transactions} />
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
  title: { color: colors.ink, fontSize: 23, fontWeight: '700' },
  headerSpace: { width: 48 },
  search: {
    backgroundColor: '#edf2fd',
    borderRadius: 24,
    minHeight: 48,
    paddingHorizontal: 18,
    color: colors.ink,
    fontSize: 14,
  },
  filters: { flexDirection: 'row', justifyContent: 'space-between', gap: 7 },
  filter: {
    backgroundColor: '#edf2fd',
    borderRadius: 10,
    minHeight: 45,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { backgroundColor: colors.accent },
  filterText: { color: colors.ink, fontSize: 12 },
  selectedText: { color: '#fff' },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  count: { color: colors.muted, fontSize: 13 },
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
