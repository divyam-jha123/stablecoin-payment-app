import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors } from '../src/components/payment-ui';
import {
  findLegalDocument,
  formatLegalDate,
  LEGAL_EFFECTIVE_DATE,
  legalBlockText,
  type LegalBlock,
  type LegalDocument,
} from '../src/features/legal/legal-documents';
import {
  legalDocumentPdf,
  legalPdfFileName,
} from '../src/features/legal/legal-pdf';

const BLUE = '#2f6bff';
const INK = '#0b0f1f';

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

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string')
    return <Text style={styles.body}>{block}</Text>;
  if ('bullets' in block)
    return (
      <View style={styles.bullets}>
        {block.bullets.map((item) => (
          <View key={item} style={styles.bullet}>
            <Text style={styles.body}>•</Text>
            <Text style={[styles.body, styles.bulletText]}>{item}</Text>
          </View>
        ))}
      </View>
    );
  return (
    <Text style={styles.body}>
      <Text style={styles.label}>{block.label}: </Text>
      {block.text}
    </Text>
  );
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/terms');
}

/** Saves the document as a PDF and opens the share sheet to keep or send it. */
async function sharePdf(document: LegalDocument) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing unavailable');
  const file = new File(Paths.cache, legalPdfFileName(document));
  file.create({ overwrite: true });
  file.write(legalDocumentPdf(document));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: document.title,
    UTI: 'com.adobe.pdf',
  });
}

export default function LegalDocumentScreen() {
  const document = findLegalDocument(useLocalSearchParams().doc);
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!document || busy) return;
    setBusy(true);
    try {
      await sharePdf(document);
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Glyph d="M15 18l-6-6 6-6" color={BLUE} size={26} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {document?.title ?? 'Document not found'}
        </Text>

        <View style={styles.card}>
          {document ? (
            <>
              <View style={styles.effective}>
                <Text style={styles.effectiveText}>
                  Effective date: {formatLegalDate(LEGAL_EFFECTIVE_DATE)}
                </Text>
              </View>
              {document.sections.map((section, index) => (
                <View key={section.heading} style={styles.section}>
                  <Text accessibilityRole="header" style={styles.heading}>
                    {index + 1}. {section.heading}
                  </Text>
                  {section.body.map((block) => (
                    <Block key={legalBlockText(block)} block={block} />
                  ))}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.body}>
              This document is not available. Go back and choose another one.
            </Text>
          )}
        </View>
      </ScrollView>
      {document ? (
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Download ${document.title} as PDF`}
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={download}
            style={({ pressed }) => [
              styles.download,
              (pressed || busy) && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={BLUE} />
            ) : (
              <Glyph
                d="M6 3h9l4 4v14H6z M14 3v5h5 M12 11v6 M9.5 14.5 12 17l2.5-2.5"
                color={BLUE}
                size={20}
              />
            )}
            <Text style={styles.downloadText}>Download as PDF</Text>
          </Pressable>
        </View>
      ) : null}
      <DashboardNav current="/profile" />
    </SafeAreaView>
  );
}

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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
  },
  backText: { color: BLUE, fontSize: 18 },
  title: {
    color: INK,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 14,
  },
  card: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    shadowColor: '#0b2a6b',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  effective: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#eef3fb',
  },
  effectiveText: { color: INK, fontSize: 14 },
  section: { marginTop: 18, gap: 6 },
  heading: { color: INK, fontSize: 17, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  label: { color: INK, fontWeight: '600' },
  bullets: { gap: 4, paddingLeft: 4 },
  bullet: { flexDirection: 'row', gap: 8 },
  bulletText: { flex: 1 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e3e9f3',
  },
  download: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BLUE,
    backgroundColor: '#ffffff',
  },
  downloadText: { color: BLUE, fontSize: 16, fontWeight: '600' },
});
