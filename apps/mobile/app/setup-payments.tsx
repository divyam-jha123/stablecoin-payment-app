import { useRef, useState, useSyncExternalStore } from 'react';
import { Redirect, router, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { AppIcon, colors } from '../src/components/payment-ui';
import { walletStore } from '../src/features/account/metamask';
import {
  authorizeKeyCall,
  DAILY_LIMIT_OPTIONS_USD,
  newPaymentKey,
  paymentKeyStore,
  settlementAddress,
  TRIP_LENGTH_OPTIONS_DAYS,
} from '../src/features/account/payment-key';
import { publicClient } from '../src/features/account/tempo';
import { walletError } from '../src/features/account/wallet-store';
import { uiPreviewEnabled } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

type Stage = 'choose' | 'metamask' | 'confirming' | 'done';

const POINTS = [
  {
    icon: 'wallet',
    title: 'Your money stays in MetaMask',
    copy: 'Each payment is taken from your MetaMask account only when you pay.',
  },
  {
    icon: 'store',
    title: 'Pays merchants through TravelPe only',
    copy: "Payments can only go to TravelPe's settlement account, which pays the merchant in INR.",
  },
  {
    icon: 'check',
    title: 'Your limits, enforced on Tempo',
    copy: 'A daily limit and an end date. Turn it off anytime in Profile.',
  },
] as const;

const TRIP_LABELS: Record<(typeof TRIP_LENGTH_OPTIONS_DAYS)[number], string> = {
  7: '1 week',
  14: '2 weeks',
  30: '30 days',
};

function endDate(tripDays: number) {
  return new Date(Date.now() + tripDays * 86_400_000).toLocaleDateString(
    'en-IN',
    { day: 'numeric', month: 'short' },
  );
}

function Choice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SetupPayments() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
  );
  const queryClient = useQueryClient();
  const [dailyLimitUsd, setDailyLimitUsd] = useState<number>(250);
  const [tripDays, setTripDays] = useState<number>(14);
  const [stage, setStage] = useState<Stage>('choose');
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const owner = wallet.account?.address;
  const settlement = settlementAddress();
  const unavailable = !uiPreviewEnabled && !settlement;
  const busy = stage !== 'choose';

  if (!uiPreviewEnabled && !owner) return <Redirect href="/connect" />;

  async function approve() {
    if (lock.current || unavailable) return;
    lock.current = true;
    setError(null);
    try {
      if (uiPreviewEnabled) {
        // Preview: same steps on a timer; no wallet or chain is touched.
        setStage('metamask');
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setStage('confirming');
        await new Promise((resolve) => setTimeout(resolve, 900));
      } else {
        const key = newPaymentKey({ owner: owner!, dailyLimitUsd, tripDays });
        setStage('metamask');
        const hash = await walletStore.sendTransaction(
          authorizeKeyCall(key, settlement!),
        );
        setStage('confirming');
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 90_000,
        });
        if (receipt.status !== 'success') {
          throw new Error(
            'Tempo rejected the approval. Nothing was changed; try again.',
          );
        }
        await paymentKeyStore.save(key);
        const status = await paymentKeyStore.status(owner!);
        if (status.state !== 'active') {
          throw new Error(
            'Tap to pay could not be confirmed on Tempo. Try again.',
          );
        }
        await queryClient.invalidateQueries({ queryKey: ['payment-key'] });
      }
      setStage('done');
      setTimeout(() => router.replace('/home'), 900);
    } catch (cause) {
      setStage('choose');
      setError(walletError(cause));
    } finally {
      lock.current = false;
    }
  }

  async function notNow() {
    if (busy) return;
    if (!uiPreviewEnabled && owner) await paymentKeyStore.defer(owner);
    router.replace('/home');
  }

  const buttonLabel = {
    choose: 'Approve in MetaMask',
    metamask: 'Waiting for MetaMask…',
    confirming: 'Confirming on Tempo…',
    done: 'Tap to pay is on',
  }[stage];

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          hitSlop={8}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/home')
          }
          style={({ pressed }) => [
            styles.back,
            busy && styles.backDisabled,
            pressed && styles.backPressed,
          ]}
        >
          <AppIcon name="chevron-left" size={22} color={tc(colors.ink)} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <AppIcon name="send" size={34} color={tc(colors.accent)} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Turn on tap to pay
        </Text>
        <Text style={styles.subtitle}>
          Approve once in MetaMask. After that, pay any UPI QR straight from
          TravelPe, without switching apps.
        </Text>

        <View style={styles.points}>
          {POINTS.map((point) => (
            <View key={point.title} style={styles.point}>
              <View style={styles.pointIcon}>
                <AppIcon
                  name={point.icon}
                  size={20}
                  color={tc(colors.accent)}
                />
              </View>
              <View style={styles.pointCopy}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointText}>{point.copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Daily limit</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {DAILY_LIMIT_OPTIONS_USD.map((usd) => (
            <Choice
              key={usd}
              label={`$${usd}`}
              selected={dailyLimitUsd === usd}
              disabled={busy}
              onPress={() => setDailyLimitUsd(usd)}
            />
          ))}
        </View>
        <Text style={styles.hint}>Includes network fees. Resets daily.</Text>

        <Text style={styles.label}>Trip length</Text>
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {TRIP_LENGTH_OPTIONS_DAYS.map((days) => (
            <Choice
              key={days}
              label={TRIP_LABELS[days]}
              selected={tripDays === days}
              disabled={busy}
              onPress={() => setTripDays(days)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          Ends on {endDate(tripDays)}. You can renew it anytime.
        </Text>

        {unavailable ? (
          <Text accessibilityRole="alert" style={styles.error}>
            Tap to pay isn&apos;t available in this build yet. You can still pay
            by approving each payment in MetaMask.
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {stage === 'metamask' && !uiPreviewEnabled ? (
          <Text accessibilityLiveRegion="polite" style={styles.hint}>
            Approve the request in MetaMask, then return here.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || unavailable, busy }}
          disabled={busy || unavailable}
          onPress={() => void approve()}
          style={({ pressed }) => [
            styles.button,
            stage === 'done' && styles.buttonDone,
            unavailable && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {stage === 'metamask' || stage === 'confirming' ? (
            <ActivityIndicator size="small" color={tc('#ffffff')} />
          ) : stage === 'done' ? (
            <AppIcon name="check" size={20} color={tc('#ffffff')} />
          ) : null}
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          hitSlop={8}
          onPress={() => void notNow()}
          style={({ pressed }) => [styles.notNow, pressed && styles.pressed]}
        >
          <Text style={styles.notNowText}>
            Not now, approve each payment in MetaMask
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 12,
    paddingTop: 4,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backDisabled: { opacity: 0.4 },
  backPressed: { opacity: 0.7 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#e7f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 18,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  points: {
    marginTop: 22,
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f4f8ff',
  },
  point: { flexDirection: 'row', gap: 12 },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointCopy: { flex: 1, gap: 2 },
  pointTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  pointText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  choices: { flexDirection: 'row', gap: 10 },
  choice: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  choiceSelected: { borderColor: colors.accent, backgroundColor: '#e7f0ff' },
  choiceText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  choiceTextSelected: { color: colors.accent },
  hint: { color: colors.muted, fontSize: 13, marginTop: 8 },
  error: { color: colors.error, fontSize: 14, lineHeight: 20, marginTop: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  button: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDone: { backgroundColor: '#00974f' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  notNow: { alignSelf: 'center', marginTop: 12, paddingVertical: 6 },
  notNowText: { color: colors.muted, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.75 },
});
