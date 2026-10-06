import { useState } from 'react';
import { router, usePathname, type Href } from 'expo-router';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './payment-ui';

const pages = [
  { label: 'Splash', href: '/' },
  { label: 'Onboarding', href: '/onboarding' },
  { label: 'Connect / sign in', href: '/connect' },
  { label: 'Dashboard', href: '/home' },
  { label: 'Payments', href: '/payments' },
  { label: 'Profile', href: '/profile' },
  { label: 'Add money design preview', href: '/add-money' },
  { label: 'Review add money design', href: '/review-add-money' },
  { label: 'QR scanner', href: '/scanner' },
  {
    label: 'Payment confirmation',
    href: {
      pathname: '/confirmation',
      params: {
        merchantName: 'Sample merchant',
        merchantVpa: 'sample@upi',
        inrAmount: '250',
      },
    },
  },
  { label: 'Processing', href: '/processing' },
  { label: 'Success', href: '/success' },
  { label: 'Failed', href: '/failed' },
  { label: 'Activity', href: '/activity' },
  { label: 'Transaction details', href: '/details' },
] satisfies { label: string; href: Href }[];

export function PreviewNavigator() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <>
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open UI preview pages"
          onPress={() => setOpen(true)}
          style={styles.trigger}
        >
          <Text style={styles.triggerText}>UI pages</Text>
        </Pressable>
      </SafeAreaView>
      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <SafeAreaView style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.title}>
                Preview pages
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(false)}
              >
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <Text style={styles.note}>
              Development only. Sample screens do not connect a wallet or move
              funds.
            </Text>
            <ScrollView>
              {pages.map((page) => (
                <Pressable
                  key={page.label}
                  accessibilityRole="button"
                  onPress={() => {
                    setOpen(false);
                    router.push(page.href);
                  }}
                  style={styles.page}
                >
                  <Text style={styles.pageText}>{page.label}</Text>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 12,
    top: 0,
    zIndex: 10,
  },
  trigger: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  triggerText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 24,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  close: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  note: { color: colors.muted, marginBottom: 16, marginTop: 8 },
  page: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  pageText: { color: colors.ink, fontSize: 16 },
  arrow: { color: colors.muted, fontSize: 24 },
});
