import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors } from '../src/components/payment-ui';
import {
  formatLegalDate,
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  type LegalDocumentId,
} from '../src/features/legal/legal-documents';
import {
  DATA_REQUESTS,
  type DataRequest,
} from '../src/features/support/support';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

const BLUE = '#2f6bff';
const INK = '#0b0f1f';
const CHEVRON = 'M9 6l6 6-6 6';

// Outline icons on a 24px grid, one per legal document.
const DOCUMENT_ICONS: Record<
  LegalDocumentId,
  { icon: string; tint: string; background: string }
> = {
  terms: {
    icon: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',
    tint: '#6a4be0',
    background: '#ede7ff',
  },
  privacy: {
    icon: 'M12 2.5 4.5 5.5v6c0 4.7 3.2 8.6 7.5 10 4.3-1.4 7.5-5.3 7.5-10v-6z M8.5 12l2.5 2.5 4.5-5',
    tint: '#22a35a',
    background: '#e2f6ea',
  },
  cookies: {
    icon: 'M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3.5-3A3 3 0 0 1 14 5.5 3 3 0 0 1 12 3z M8.5 10h.01 M9 15h.01 M14 14.5h.01',
    tint: '#e08a00',
    background: '#fff1d6',
  },
  refunds: {
    icon: 'M3 6h18v12H3z M3 10h18 M15 13.5a2.5 2.5 0 1 0 2.5 2.5 M17.5 13.5v2.5H15',
    tint: '#e5484d',
    background: '#fde6e6',
  },
};

const DATA_ROWS: readonly {
  request: DataRequest;
  title: string;
  subtitle: string;
}[] = [
  {
    request: 'export',
    title: 'Personal Data Request',
    subtitle: 'Request a copy of your personal data',
  },
  {
    request: 'delete',
    title: 'Data Deletion Request',
    subtitle: 'Manage and delete your account data',
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
        stroke={tc(color)}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function TermsAndPrivacy() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/profile')
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Glyph d="M15 18l-6-6 6-6" color={tc(BLUE)} size={28} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Terms & Privacy
        </Text>
        <Text style={styles.intro}>
          Please read our terms and privacy policy carefully to understand how
          we protect and use your data.
        </Text>

        <Text style={styles.section}>Legal Documents</Text>
        <View style={styles.rows}>
          {LEGAL_DOCUMENTS.map((document) => {
            const look = DOCUMENT_ICONS[document.id];
            return (
              <Pressable
                key={document.id}
                accessibilityRole="button"
                accessibilityHint={document.summary}
                onPress={() =>
                  router.push({
                    pathname: '/legal-document',
                    params: { doc: document.id },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: tc(look.background, 'bg') },
                  ]}
                >
                  <Glyph d={look.icon} color={tc(look.tint)} size={20} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{document.title}</Text>
                  <Text style={styles.rowSubtitle}>{document.summary}</Text>
                </View>
                <Glyph d={CHEVRON} color={tc(INK)} size={20} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Data Privacy Control</Text>
        <View style={styles.rows}>
          {DATA_ROWS.map((row) => (
            <Pressable
              key={row.request}
              accessibilityRole="button"
              accessibilityHint={DATA_REQUESTS[row.request].title}
              onPress={() =>
                router.push({
                  pathname: '/support-ticket',
                  params: { request: row.request },
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <Glyph d={CHEVRON} color={tc(INK)} size={20} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.updated}>
          Last updated: {formatLegalDate(LEGAL_EFFECTIVE_DATE, true)}
        </Text>
      </ScrollView>
      <DashboardNav current="/profile" />
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
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
  title: { color: INK, fontSize: 34, fontWeight: '800', marginTop: 2 },
  intro: { color: INK, fontSize: 15, lineHeight: 21, marginTop: 6 },
  section: {
    color: INK,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
  },
  rows: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    shadowColor: '#0b2a6b',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { color: INK, fontSize: 16, fontWeight: '600' },
  rowSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  updated: { color: colors.muted, fontSize: 13, marginTop: 18 },
});
