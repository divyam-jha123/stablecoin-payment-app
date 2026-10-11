import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import { AppIcon, ScanIcon } from '../src/components/payment-ui';
import { TransactionCard } from '../src/components/transaction-card';
import { useRotatingHint } from '../src/components/home-search-bar';
import { useAccount } from '../src/features/account/use-account';
import { useExplorer } from '../src/features/account/use-explorer';
import {
  profileAvatarColor,
  profileInitial,
} from '../src/features/account/profile-details';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  recentRecipients,
  type Recipient,
} from '../src/features/payment/simulated-payments';
import { activityItems } from '../src/features/payment/received-transfers';
import { useReceivedTransfers } from '../src/features/payment/received-transfers-store';
import {
  normalizeQuery,
  searchPages,
  searchPagesFor,
  searchRecipients,
  searchTransactions,
  upiIdFromQuery,
  type SearchPage,
} from '../src/features/search/search';
import { useVoiceSearch } from '../src/features/search/voice-search';
import {
  recentSearchStore,
  useRecentSearches,
} from '../src/features/search/recent-searches-store';
import {
  previewDashboardWith,
  previewInr,
  previewRecipients,
} from '../src/preview-data';
import { homeTheme as theme } from '../src/theme/home';
import { uiPreviewEnabled } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const SUGGESTIONS = 8;
const MAX_TRANSACTIONS = 5;

type IconName = ComponentProps<typeof AppIcon>['name'];

const pageIcons: Record<SearchPage['href'], IconName | 'scan'> = {
  '/home': 'home',
  '/activity': 'activity',
  '/payments': 'send',
  '/scanner': 'scan',
  '/receive': 'download',
  '/add-money': 'card-plus',
  '/profile': 'person',
  '/edit-profile': 'person',
  '/payment-methods': 'wallet',
  '/setup-payments': 'currency',
  '/security': 'lock',
  '/login-activity': 'check',
  '/notifications': 'bell',
  '/theme': 'eye',
  '/help': 'help',
  '/support-chat': 'help',
  '/terms': 'check',
};

/**
 * Search app pages, people and merchants paid before, and transactions, or
 * pay a typed UPI ID.
 */
export default function Search() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const { voice } = useLocalSearchParams<{ voice?: string }>();
  const { wallet } = useAccount();
  const { explorer } = useExplorer();
  const address = uiPreviewEnabled ? null : wallet.account?.address;
  const payments = useSimulatedPayments(address);
  // Wallet mode searches real testnet pathUSD received next to sent payments.
  const received = useReceivedTransfers(address);
  const transactionsSource = uiPreviewEnabled
    ? previewDashboardWith(payments).transactions
    : activityItems(payments, received);
  // Wallet top-ups use the faucet button on Home, and Google explorers have
  // no wallet to set up Tap to Pay for, so those pages are left out there.
  const pages = searchPages.filter(
    (page) =>
      (page.href !== '/add-money' || uiPreviewEnabled) &&
      (page.href !== '/setup-payments' || !explorer),
  );
  const recipients = uiPreviewEnabled
    ? previewRecipients
    : recentRecipients(payments);
  const [query, setQuery] = useState('');
  const input = useRef<TextInput>(null);
  const voiceSearch = useVoiceSearch(setQuery);
  const listening = voiceSearch.state.status === 'listening';
  const startVoice = voiceSearch.start;
  const { hint } = useRotatingHint(listening || query.length > 0);

  // The Home mic opens this screen and starts listening straight away.
  const voiceStarted = useRef(false);
  useEffect(() => {
    if (voice !== '1' || voiceStarted.current) return;
    voiceStarted.current = true;
    void startVoice();
  }, [voice, startVoice]);

  const text = normalizeQuery(query);
  const upiId = upiIdFromQuery(query);
  const matches = text
    ? searchRecipients(recipients, query)
    : recipients.slice(0, SUGGESTIONS);
  const pageMatches = searchPagesFor(pages, query);
  const transactionMatches = searchTransactions(
    transactionsSource,
    query,
    previewInr,
  ).slice(0, MAX_TRANSACTIONS);
  // A known UPI ID shows as its recipient, not twice.
  const payNew =
    upiId && !matches.some((recipient) => recipient.vpa === upiId)
      ? upiId
      : null;

  const recentSearches = useRecentSearches();
  // Remember what was searched once it leads somewhere.
  function remember() {
    recentSearchStore.add(query);
  }

  function openRecipient(recipient: Recipient) {
    remember();
    router.push({
      pathname: '/recipient',
      params: {
        name: recipient.name,
        ...(recipient.vpa ? { vpa: recipient.vpa } : {}),
      },
    });
  }

  function openPage(page: SearchPage) {
    remember();
    router.push(page.href);
  }

  function payUpiId(vpa: string) {
    remember();
    router.push({
      pathname: '/confirmation',
      params: { merchantName: vpa, merchantVpa: vpa },
    });
  }

  function toggleVoice() {
    if (listening) voiceSearch.stop();
    else if (!voiceSearch.available) {
      // Fall back to keyboard dictation where the speech module is missing.
      input.current?.focus();
      void voiceSearch.start();
    } else {
      input.current?.blur();
      void voiceSearch.start();
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <AppIcon name="back" color={tc(theme.colors.text)} size={22} />
        </Pressable>
        <View style={[styles.bar, listening && styles.barListening]}>
          <AppIcon name="search" size={20} color={tc(theme.colors.muted)} />
          <TextInput
            ref={input}
            value={query}
            onChangeText={setQuery}
            autoFocus={voice !== '1' || !voiceSearch.available}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            maxLength={120}
            placeholder={listening ? 'Listening…' : hint}
            placeholderTextColor={tc(theme.colors.searchHint)}
            accessibilityLabel="Search contacts, UPI IDs, merchants"
            onSubmitEditing={() => {
              if (!text) return;
              remember();
              if (payNew) payUpiId(payNew);
              else if (pageMatches[0]) openPage(pageMatches[0]);
              else if (matches[0]) openRecipient(matches[0]);
            }}
            style={styles.input}
          />
          {query.length > 0 && !listening && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              listening ? 'Stop voice search' : 'Search by voice'
            }
            accessibilityState={{ busy: listening }}
            onPress={toggleVoice}
            hitSlop={12}
            style={({ pressed }) => [
              styles.mic,
              listening && styles.micListening,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon
              name="mic"
              size={20}
              color={tc(
                listening ? theme.colors.onBalance : theme.colors.muted,
              )}
            />
          </Pressable>
        </View>
      </View>
      {voiceSearch.state.status === 'error' && (
        <Text accessibilityRole="alert" style={styles.error}>
          {voiceSearch.state.message}
        </Text>
      )}
      {voiceSearch.state.status === 'keyboard' && (
        <Text accessibilityLiveRegion="polite" style={styles.listening}>
          {voiceSearch.state.message}
        </Text>
      )}
      {listening && (
        <Text accessibilityLiveRegion="polite" style={styles.listening}>
          Listening… say a name or UPI ID
        </Text>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!text && recentSearches.length > 0 && (
          <View style={styles.sectionRow}>
            <Text accessibilityRole="header" style={styles.section}>
              Recent searches
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all recent searches"
              onPress={() => recentSearchStore.clear()}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          </View>
        )}
        {!text &&
          recentSearches.map((item) => (
            <View key={item} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Search again for ${item}`}
                onPress={() => setQuery(item)}
                style={({ pressed }) => [
                  styles.recentSearch,
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon
                  name="activity"
                  size={18}
                  color={tc(theme.colors.muted)}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {item}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item} from recent searches`}
                onPress={() => recentSearchStore.remove(item)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.removeRecent,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        {payNew && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pay UPI ID ${payNew}`}
            onPress={() => payUpiId(payNew)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.avatar, styles.payAvatar]}>
              <AppIcon name="send" size={20} color={tc(theme.colors.primary)} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>
                Pay {payNew}
              </Text>
              <Text style={styles.detail}>New UPI ID</Text>
            </View>
            <AppIcon name="arrow" size={18} color={tc(theme.colors.muted)} />
          </Pressable>
        )}
        {pageMatches.length > 0 && (
          <Text accessibilityRole="header" style={styles.section}>
            Pages
          </Text>
        )}
        {pageMatches.map((page) => {
          const icon = pageIcons[page.href];
          return (
            <Pressable
              key={page.href}
              accessibilityRole="button"
              accessibilityLabel={`${page.title}. ${page.detail}.`}
              onPress={() => openPage(page)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.avatar, styles.payAvatar]}>
                {icon === 'scan' ? (
                  <ScanIcon size={20} color={tc(theme.colors.primary)} />
                ) : (
                  <AppIcon
                    name={icon}
                    size={20}
                    color={tc(theme.colors.primary)}
                  />
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {page.title}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {page.detail}
                </Text>
              </View>
              <AppIcon name="arrow" size={18} color={tc(theme.colors.muted)} />
            </Pressable>
          );
        })}
        {matches.length > 0 && (
          <Text accessibilityRole="header" style={styles.section}>
            {text ? 'Contacts & merchants' : 'Recent'}
          </Text>
        )}
        {matches.map((recipient) => (
          <Pressable
            key={recipient.id}
            accessibilityRole="button"
            accessibilityLabel={`${recipient.name}. View payment history.`}
            onPress={() => openRecipient(recipient)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: tc(profileAvatarColor(recipient.name), 'bg'),
                },
              ]}
            >
              <Text style={styles.initial}>
                {profileInitial(recipient.name)}
              </Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>
                {recipient.name}
              </Text>
              {recipient.vpa && (
                <Text style={styles.detail} numberOfLines={1}>
                  {recipient.vpa}
                </Text>
              )}
            </View>
            <AppIcon name="arrow" size={18} color={tc(theme.colors.muted)} />
          </Pressable>
        ))}
        {transactionMatches.length > 0 && (
          <Text accessibilityRole="header" style={styles.section}>
            Transactions
          </Text>
        )}
        {transactionMatches.length > 0 && (
          <View style={styles.transactions}>
            {transactionMatches.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                // Same as Activity: sent payments open their receipt.
                onPress={
                  transaction.direction === 'Sent'
                    ? () => {
                        remember();
                        router.push({
                          pathname: '/receipt',
                          params: { id: transaction.id },
                        });
                      }
                    : undefined
                }
              />
            ))}
          </View>
        )}
        {text &&
          !payNew &&
          pageMatches.length === 0 &&
          matches.length === 0 &&
          transactionMatches.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                No matches for “{query.trim()}”
              </Text>
              <Text style={styles.detail}>
                Try a page like Activity or Profile, a name or merchant, or a
                full UPI ID like name@bank to pay someone new.
              </Text>
            </View>
          )}
        {!text && matches.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No recent recipients yet</Text>
            <Text style={styles.detail}>
              People and merchants you pay will show up here. Type a UPI ID to
              pay someone new.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.layout.pageGutter,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  back: {
    width: 36,
    height: theme.layout.touchTarget,
    justifyContent: 'center',
  },
  clear: { fontSize: 14, color: theme.colors.muted, paddingHorizontal: 4 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearAll: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  recentSearch: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 48,
  },
  removeRecent: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 14, color: theme.colors.muted },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: theme.colors.balanceOutline,
    backgroundColor: '#f4f8ff',
  },
  barListening: { borderColor: theme.colors.primary },
  input: {
    ...theme.typography.body,
    flex: 1,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
  },
  mic: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micListening: { backgroundColor: theme.colors.primary },
  listening: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    paddingHorizontal: theme.layout.pageGutter,
    paddingBottom: theme.spacing.sm,
  },
  error: {
    ...theme.typography.caption,
    color: '#a92c24',
    paddingHorizontal: theme.layout.pageGutter,
    paddingBottom: theme.spacing.sm,
  },
  content: {
    paddingHorizontal: theme.layout.pageGutter,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payAvatar: { backgroundColor: theme.colors.actionSurface },
  initial: { fontSize: 16, fontWeight: '700', color: theme.colors.onBalance },
  rowText: { flex: 1, minWidth: 0 },
  name: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detail: { ...theme.typography.caption, color: theme.colors.muted },
  transactions: { gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  empty: { paddingVertical: theme.spacing.xl, gap: theme.spacing.xs },
  emptyTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pressed: { opacity: 0.7 },
});
