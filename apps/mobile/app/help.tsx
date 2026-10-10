import { useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors } from '../src/components/payment-ui';
import { findFaqs, type HelpTopic } from '../src/features/support/support';

const BLUE = '#2f6bff';
const INK = '#0b0f1f';
const CHEVRON = 'M9 6l6 6-6 6';

// Quick Help tiles; each narrows the FAQs to one topic. Icons on a 24px grid.
const TOPICS: readonly {
  topic: HelpTopic;
  title: string;
  icon: string;
  tint: string;
  background: string;
}[] = [
  {
    topic: 'payment',
    title: 'Recent\nPayment',
    icon: 'M3 6h18v12H3z M3 10h18 M6.5 14.5h4',
    tint: '#2f6bff',
    background: '#e3edff',
  },
  {
    topic: 'security',
    title: 'Security',
    icon: 'M12 2.5 4.5 5.5v6c0 4.7 3.2 8.6 7.5 10 4.3-1.4 7.5-5.3 7.5-10v-6z M8.5 12l2.5 2.5 4.5-5',
    tint: '#22a35a',
    background: '#e2f6ea',
  },
  {
    topic: 'fees',
    title: 'Fees &\nCharges',
    icon: 'M5 7c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5-2.7 2.5-6 2.5S5 8.4 5 7z M5 7v4c0 1.4 2.7 2.5 6 2.5 M17 7v3 M5 11v4c0 1.4 2.7 2.5 6 2.5 M17.5 13a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M17.5 15v3',
    tint: '#e08a00',
    background: '#fff1d6',
  },
  {
    topic: 'general',
    title: 'General\nInfo',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5.5 M12 7.5h.01',
    tint: '#8b3fd9',
    background: '#f3e6fd',
  },
];

function Glyph({
  d,
  color,
  size = 22,
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

export default function Help() {
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState<HelpTopic | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const faqs = findFaqs(search, topic);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/profile')
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Glyph d="M15 18l-6-6 6-6" color={BLUE} size={28} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Help & Support
        </Text>

        <View style={styles.search}>
          <Glyph
            d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4"
            color="#6b778c"
            size={20}
          />
          <TextInput
            accessibilityLabel="Search for help"
            value={search}
            onChangeText={setSearch}
            placeholder="Search for help, FAQs..."
            placeholderTextColor="#7d8aa3"
            returnKeyType="search"
            maxLength={80}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={10}
              onPress={() => setSearch('')}
            >
              <Glyph d="M6 6l12 12 M18 6L6 18" color="#6b778c" size={18} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.section}>Quick Help</Text>
        <View style={styles.tiles}>
          {TOPICS.map((item) => {
            const selected = topic === item.topic;
            return (
              <Pressable
                key={item.topic}
                accessibilityRole="button"
                accessibilityLabel={item.title.replace('\n', ' ')}
                accessibilityState={{ selected }}
                onPress={() => {
                  setTopic(selected ? null : item.topic);
                  setOpenFaq(null);
                }}
                style={({ pressed }) => [
                  styles.tile,
                  selected && styles.tileSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.tileIcon,
                    { backgroundColor: item.background },
                  ]}
                >
                  <Glyph d={item.icon} color={item.tint} size={24} />
                </View>
                <Text style={styles.tileText}>{item.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>FAQs</Text>
        <View style={styles.faqs}>
          {faqs.length ? (
            faqs.map((faq) => {
              const open = openFaq === faq.id;
              return (
                <Pressable
                  key={faq.id}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setOpenFaq(open ? null : faq.id)}
                  style={({ pressed }) => [
                    styles.faq,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.faqRow}>
                    <Text style={styles.question}>{faq.question}</Text>
                    <View style={open && styles.chevronOpen}>
                      <Glyph d={CHEVRON} color={INK} size={20} />
                    </View>
                  </View>
                  {open ? (
                    <Text style={styles.answer}>{faq.answer}</Text>
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.faq}>
              <Text style={styles.question}>No answers found</Text>
              <Text style={styles.answer}>
                Try other words, or raise a support ticket below.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactSubtitle}>
            Ask a question or report a problem
          </Text>
          <View style={styles.contactActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chat with us, demo"
              onPress={() => router.push('/support-chat')}
              style={({ pressed }) => [
                styles.contactButton,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[styles.contactIcon, { backgroundColor: '#e3edff' }]}
              >
                <Glyph
                  d="M4 5h11v8H8l-4 3z M9 16v1h7l4 3V9h-3"
                  color={BLUE}
                  size={20}
                />
              </View>
              <Text style={styles.contactText}>Chat with us</Text>
              <View style={styles.demoBadge}>
                <Text style={styles.demoText}>Demo</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/support-ticket')}
              style={({ pressed }) => [
                styles.contactButton,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[styles.contactIcon, { backgroundColor: '#fff1d6' }]}
              >
                <Glyph
                  d="M12 20h8 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"
                  color="#e08a00"
                  size={20}
                />
              </View>
              <Text style={styles.contactText}>Raise a Support Ticket</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <DashboardNav current="/profile" />
    </SafeAreaView>
  );
}

const card = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e3e9f3',
  shadowColor: '#0b2a6b',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f6fc' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  back: { width: 44, height: 44, justifyContent: 'center' },
  title: {
    color: INK,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 14,
  },
  search: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  searchInput: { flex: 1, color: INK, fontSize: 16, paddingVertical: 10 },
  section: {
    color: INK,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    ...card,
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  tileSelected: { borderColor: BLUE, backgroundColor: '#f2f7ff' },
  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    color: INK,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    textAlign: 'center',
  },
  faqs: { gap: 10 },
  faq: {
    ...card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  question: { flex: 1, color: INK, fontSize: 16, fontWeight: '500' },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  answer: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  contact: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#e8f0fd',
    borderWidth: 1,
    borderColor: '#d6e3f8',
  },
  contactTitle: { color: INK, fontSize: 19, fontWeight: '700' },
  contactSubtitle: { color: colors.muted, fontSize: 14, marginTop: 2 },
  contactActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  contactButton: {
    ...card,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  demoBadge: {
    position: 'absolute',
    top: -9,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#fff1d6',
    borderWidth: 1,
    borderColor: '#f5d08a',
  },
  demoText: { color: '#8a5a00', fontSize: 11, fontWeight: '700' },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: { flex: 1, color: INK, fontSize: 14, fontWeight: '600' },
});
