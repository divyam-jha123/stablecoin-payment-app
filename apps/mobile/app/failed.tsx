import { useEffect, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';
import { previewSamplePayment } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

// Metro bundles this static illustration at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const illustration = require('../assets/illustrations/payment-failed.jpg');
// Source artwork is 960 x 865.
const ILLUSTRATION_RATIO = 960 / 865;
// Navy from the traveller's suit and the speech-bubble text.
const NAVY = '#10243A';
// Long enough for the spinner to register before processing opens.
const RETRY_FEEDBACK_MS = 450;
const HELP_COPY =
  'The stablecoin to INR conversion did not complete, so the merchant was not paid. Check your balance in Activity before trying again.';

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

function formatInr(amount: string | undefined) {
  const value = Number(amount);
  if (!amount || !Number.isFinite(value) || value <= 0) return undefined;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function Failed() {
  const params = useLocalSearchParams<{
    merchantName?: string | string[];
    location?: string | string[];
    inrAmount?: string | string[];
    token?: string | string[];
  }>();
  // The preview opens this screen without a payment, so it falls back to the
  // sample one; wallet mode only shows what the failed payment passed in.
  const sample = uiPreviewEnabled ? previewSamplePayment : undefined;
  const merchantName = firstParam(params.merchantName) ?? sample?.merchantName;
  const location = firstParam(params.location) ?? sample?.location;
  const amount = formatInr(firstParam(params.inrAmount) ?? sample?.inrAmount);
  const token = firstParam(params.token) ?? sample?.token;
  const inrAmount = firstParam(params.inrAmount) ?? sample?.inrAmount;
  const [retrying, setRetrying] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    retryTimer.current = setTimeout(() => {
      if (merchantName && amount && token) {
        // Run the same payment again; processing shows its result.
        router.replace({
          pathname: '/processing',
          params: { merchantName, location, inrAmount, token },
        });
      } else if (router.canGoBack()) {
        // Nothing to resend: back to the payment review.
        router.back();
      } else {
        router.replace('/home');
      }
    }, RETRY_FEEDBACK_MS);
  };
  const showHelp = () => Alert.alert('Why did this fail?', HELP_COPY);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to wallet"
          hitSlop={8}
          onPress={() => router.replace('/home')}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="chevron-left" size={22} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Help"
          hitSlop={8}
          onPress={showHelp}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="help" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* <Text accessibilityRole="header" style={styles.title}>
          Payment failed
        </Text> */}
        {/* {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        {merchantName ? (
          <Text style={styles.paidTo} numberOfLines={1}>
            Not paid to {merchantName}
            {location ? ` · ${location}` : ''}
          </Text>
        ) : null} */}

        <View style={styles.illustrationArea}>
          <Image
            source={illustration}
            resizeMode="contain"
            accessibilityLabel="A traveller asks the merchant if the payment arrived; the merchant says the conversion failed and to try again."
            style={styles.illustration}
          />
        </View>

        <Text style={styles.reason}>
          {token ? `${token} to INR` : 'Stablecoin to INR'} conversion failed
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          disabled={retrying}
          onPress={retry}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            retrying && styles.buttonBusy,
          ]}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <AppIcon name="retry" size={18} color="#ffffff" />
          )}
          <Text style={styles.buttonText}>
            {retrying ? 'Trying again…' : 'Try again'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={showHelp}
          style={({ pressed }) => [styles.helpLink, pressed && styles.pressed]}
        >
          <Text style={styles.helpText}>Need help?</Text>
        </Pressable>
      </View>

      <PreviewFlowBar
        status="Failed"
        actions={[
          { label: 'Retry ›', onPress: () => router.replace('/processing') },
          { label: 'Success ›', onPress: () => router.replace('/success') },
          { label: 'Home ›', onPress: () => router.replace('/home') },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f2f6fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  title: {
    color: colors.error,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  amount: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  paidTo: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 330,
  },
  // Takes the space between the header and the caption, so the
  // illustration sits in the middle of the page at the largest size that fits.
  illustrationArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  illustration: {
    width: '100%',
    height: undefined,
    maxHeight: '100%',
    aspectRatio: ILLUSTRATION_RATIO,
  },
  reason: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  button: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBusy: { opacity: 0.85 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  helpLink: { alignSelf: 'center', marginTop: 14, paddingVertical: 4 },
  helpText: { color: colors.muted, fontSize: 14, fontWeight: '500' },
});
