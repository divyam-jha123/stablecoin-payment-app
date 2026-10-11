import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fragment, useState, useSyncExternalStore } from 'react';
import { AppIcon, colors } from '../src/components/payment-ui';
import { DashboardNav } from '../src/components/dashboard-nav';

import { uiPreviewEnabled } from '../src/ui-preview';
import { previewDashboardWith, previewInr } from '../src/preview-data';
import { TransactionCard } from '../src/components/transaction-card';
import { walletStore } from '../src/features/account/metamask';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import { type TransactionItem } from '../src/features/payment/simulated-payments';
import { activityItems } from '../src/features/payment/received-transfers';
import { useReceivedTransfers } from '../src/features/payment/received-transfers-store';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';
import {
  ActivityCalendarSheet,
  CalendarIcon,
  calendarDayLabel,
} from '../src/components/activity-calendar';
import { activeDayKeys, dayKey } from '../src/features/payment/activity-dates';

const filters = ['All', 'Sent', 'Received'];

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
  // Redraw in the new colours when the theme switches.
  useScheme();
  // Opened from a notification, it can start on a filter such as Received.
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const initialFilter = Array.isArray(params.filter)
    ? params.filter[0]
    : params.filter;
  const [filter, setFilter] = useState(
    initialFilter && filters.includes(initialFilter) ? initialFilter : 'All',
  );
  const [search, setSearch] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Midnight of the day picked on the calendar; null shows every date.
  const [day, setDay] = useState<number | null>(null);
  const query = search.trim().toLowerCase();
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const payments = useSimulatedPayments(
    uiPreviewEnabled ? null : wallet.account?.address,
  );
  // Wallet mode lists real testnet pathUSD received next to sent payments.
  const received = useReceivedTransfers(
    uiPreviewEnabled ? null : wallet.account?.address,
  );
  const source = uiPreviewEnabled
    ? previewDashboardWith(payments).transactions
    : activityItems(payments, received);
  const pickedDay = day === null ? null : dayKey(day);
  const transactions = source.filter(
    (transaction) =>
      (pickedDay === null ||
        (transaction.createdAt !== undefined &&
          dayKey(transaction.createdAt) === pickedDay)) &&
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
            accessibilityLabel={
              day === null
                ? 'Pick a date'
                : `Pick a date, showing ${calendarDayLabel(day)}`
            }
            onPress={() => setCalendarOpen(true)}
            style={[styles.calendarButton, day !== null && styles.calendarOn]}
          >
            <CalendarIcon size={26} />
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Search transactions"
          placeholder="Search by name, category or amount"
          placeholderTextColor={tc(colors.muted)}
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
        {day !== null ? (
          <View style={styles.dayChip}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change date"
              onPress={() => setCalendarOpen(true)}
              style={styles.dayChipLabel}
            >
              <CalendarIcon size={18} />
              <Text style={styles.dayChipText}>{calendarDayLabel(day)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all dates"
              hitSlop={8}
              onPress={() => setDay(null)}
            >
              <Text style={styles.dayChipClear}>Clear</Text>
            </Pressable>
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
              <AppIcon name="activity" color={tc(colors.accent)} size={34} />
            </View>
            <Text style={styles.emptyTitle}>
              {day !== null && !search && filter === 'All'
                ? 'Nothing on this day'
                : search || source.length > 0
                  ? 'No matching transactions'
                  : 'No transactions yet'}
            </Text>
            <Text style={styles.emptyText}>
              {day !== null && !search && filter === 'All'
                ? 'No payments were sent or received on this date. Pick another day.'
                : search || source.length > 0
                  ? 'Try another search term or filter.'
                  : 'Your payment activity will appear here after you pay or get paid.'}
            </Text>
          </View>
        )}
        <Text style={styles.notice}>
          {uiPreviewEnabled
            ? 'Sample data for design preview only. No funds moved.'
            : 'Your test balance is read from Tempo Moderato.'}
        </Text>
      </ScrollView>
      <ActivityCalendarSheet
        visible={calendarOpen}
        selected={day}
        activeDays={activeDayKeys(source)}
        onSelect={setDay}
        onClose={() => setCalendarOpen(false)}
      />
      <DashboardNav />
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
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
  calendarButton: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#081332',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  calendarOn: { borderWidth: 1.5, borderColor: colors.accent },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e6eefc',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
    marginTop: -6,
  },
  dayChipLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayChipText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  dayChipClear: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800' },
  search: {
    backgroundColor: '#edf2fd',
    borderRadius: 24,
    minHeight: 50,
    paddingHorizontal: 20,
    color: colors.ink,
    fontSize: 15,
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
