import { useState } from 'react';
import { router, usePathname, type Href } from 'expo-router';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './payment-ui';
import { pinStore, PREVIEW_PIN_OWNER } from '../features/account/payment-pin';
import { simulatedPaymentStore } from '../features/payment/simulated-payment-store';

const pages = [
  { label: 'Splash', href: '/' },
  { label: 'Onboarding', href: '/onboarding' },
  { label: 'Connect / sign in', href: '/connect' },
  { label: 'Set payment PIN', href: '/pin-setup' },
  {
    label: 'Enter PIN to pay',
    href: {
      pathname: '/pin-entry',
      params: {
        mode: 'verify',
        next: 'pay',
        merchantName: 'Starbucks',
        location: 'Pune, Maharashtra',
        inrAmount: '480',
        token: 'USDC',
      },
    },
  },
  { label: 'Tap to pay set-up', href: '/setup-payments' },
  { label: 'Dashboard', href: '/home' },
  { label: 'Payments', href: '/payments' },
  { label: 'Receive payment', href: '/receive' },
  { label: 'Profile', href: '/profile' },
  { label: 'Add money design preview', href: '/add-money' },
  { label: 'Review add money design', href: '/review-add-money' },
  { label: 'QR scanner', href: '/scanner' },
  {
    label: 'Pay Merchant (Figma preview)',
    href: {
      pathname: '/confirmation',
      params: {
        merchantName: 'Starbucks',
        merchantVpa: 'starbucks@upi',
        inrAmount: '480',
        demoPaymentToken: 'USDC',
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

  if (pathname === '/' || pathname === '/receive') return null;

  function resetPreview() {
    Alert.alert(
      'Start preview again?',
      'This clears your preview PIN and simulated payments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset preview',
          style: 'destructive',
          onPress: () => {
            void Promise.all([
              pinStore.clear(PREVIEW_PIN_OWNER),
              simulatedPaymentStore.clearPreview(),
            ])
              .then(() => {
                setOpen(false);
                router.replace('/onboarding');
              })
              .catch(() => Alert.alert('Reset failed', 'Please try again.'));
          },
        },
      ],
    );
  }

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
            <Pressable
              accessibilityRole="button"
              onPress={resetPreview}
              style={styles.reset}
            >
              <Text style={styles.resetText}>Reset preview and onboarding</Text>
            </Pressable>
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
  reset: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  resetText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});
