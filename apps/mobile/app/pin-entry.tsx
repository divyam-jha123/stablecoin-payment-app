import { useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import {
  isValidPin,
  PIN_LENGTH,
  pinStore,
  type PinCheck,
} from '../src/features/account/payment-pin';
import { pinOwner } from '../src/features/account/pin-owner';

type Mode = 'create' | 'verify' | 'change';
type Step = 'current' | 'new' | 'confirm';
// Where to go once the PIN is set or entered.
type Next = 'onboarding' | 'pay' | 'profile';

const STEPS: Record<Mode, Step[]> = {
  create: ['new', 'confirm'],
  verify: ['current'],
  change: ['current', 'new', 'confirm'],
};
const TITLES: Record<Mode, string> = {
  create: 'Set PIN',
  verify: 'Enter PIN',
  change: 'Change PIN',
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function failureMessage(check: Exclude<PinCheck, { ok: true }>) {
  if ('lockedUntil' in check) {
    const minutes = Math.max(
      1,
      Math.ceil((check.lockedUntil - Date.now()) / 60_000),
    );
    return `Too many wrong tries. Try again in ${minutes} min.`;
  }
  return check.attemptsLeft === 1
    ? 'Wrong PIN. 1 try left.'
    : `Wrong PIN. ${check.attemptsLeft} tries left.`;
}

export default function PinEntry() {
  const params = useLocalSearchParams<{
    mode?: string;
    next?: string;
    merchantName?: string;
    location?: string;
    inrAmount?: string;
    token?: string;
  }>();
  const mode: Mode =
    first(params.mode) === 'change'
      ? 'change'
      : first(params.mode) === 'verify'
        ? 'verify'
        : 'create';
  const next = (first(params.next) ?? 'onboarding') as Next;
  const payment = {
    merchantName: first(params.merchantName) ?? '',
    location: first(params.location) ?? '',
    inrAmount: first(params.inrAmount) ?? '',
    token: first(params.token) ?? '',
  };

  const steps = STEPS[mode];
  const [stepIndex, setStepIndex] = useState(0);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(true);
  const input = useRef<TextInput>(null);
  const step = steps[stepIndex]!;

  const label = {
    current: mode === 'verify' ? 'Enter your PIN to pay' : 'Enter current PIN',
    new: 'Enter a new PIN',
    confirm: 'Re-enter your new PIN',
  }[step];
  const amount = Number(payment.inrAmount);
  const paying =
    mode === 'verify' && payment.merchantName && Number.isFinite(amount)
      ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} to ${payment.merchantName}`
      : null;

  async function finish() {
    if (next === 'pay') {
      router.replace({ pathname: '/processing', params: payment });
    } else if (next === 'profile') {
      if (mode === 'change')
        Alert.alert('PIN changed', 'Use your new PIN for your next payment.');
      router.back();
    } else {
      // First visit: PIN set, on to Home.
      router.replace('/home');
    }
  }

  function restart(message: string) {
    setError(message);
    setPin('');
    setNewPin('');
    setStepIndex(mode === 'change' ? 1 : 0);
  }

  async function submit() {
    const owner = pinOwner();
    if (!isValidPin(pin) || busy || !owner) return;
    setBusy(true);
    setError(null);
    try {
      if (step === 'current') {
        const check = await pinStore.verify(owner, pin);
        if (!check.ok) {
          setError(failureMessage(check));
          setPin('');
          return;
        }
        if (mode === 'verify') {
          await finish();
          return;
        }
        setStepIndex(stepIndex + 1);
      } else if (step === 'new') {
        setNewPin(pin);
        setStepIndex(stepIndex + 1);
      } else {
        if (pin !== newPin) {
          restart("PINs didn't match. Enter a new PIN again.");
          return;
        }
        await pinStore.setPin(owner, pin);
        await finish();
        return;
      }
      setPin('');
    } catch {
      setError('Something went wrong. Try again.');
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  const forgotPin = () =>
    Alert.alert(
      'Forgot your PIN?',
      'Disconnect your wallet in Profile, then sign in again with MetaMask to set a new PIN.',
    );

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <AppIcon name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {TITLES[mode]}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {paying ? <Text style={styles.paying}>{paying}</Text> : null}

          <Pressable
            accessibilityLabel={`${label}. ${pin.length} of ${PIN_LENGTH} digits entered`}
            onPress={() => input.current?.focus()}
            style={styles.boxes}
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => {
              const filled = index < pin.length;
              const active =
                focused &&
                (index === pin.length ||
                  (pin.length === PIN_LENGTH && index === PIN_LENGTH - 1));
              return (
                <View
                  key={index}
                  style={[styles.box, active && styles.boxActive]}
                >
                  {filled ? <View style={styles.dot} /> : null}
                </View>
              );
            })}
          </Pressable>
          {/* The phone's own number keyboard types into this hidden field. */}
          <TextInput
            ref={input}
            value={pin}
            onChangeText={(text) => {
              setError(null);
              setPin(text.replace(/\D/g, '').slice(0, PIN_LENGTH));
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => void submit()}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            autoFocus
            caretHidden
            autoComplete="off"
            importantForAutofill="no"
            contextMenuHidden
            style={styles.hiddenInput}
          />

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {step === 'current' ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={forgotPin}
              style={styles.forgot}
            >
              <Text style={styles.forgotText}>Forgot PIN?</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: pin.length < PIN_LENGTH || busy }}
            disabled={pin.length < PIN_LENGTH || busy}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.button,
              (pin.length < PIN_LENGTH || busy) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {busy ? <ActivityIndicator color="#ffffff" /> : null}
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    height: 56,
    marginTop: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef3fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#000000', fontSize: 22, fontWeight: '800' },
  body: { flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingTop: 72 },
  label: { color: '#111111', fontSize: 18, fontWeight: '600' },
  paying: { color: colors.muted, fontSize: 15, marginTop: 6 },
  boxes: { flexDirection: 'row', gap: 16, marginTop: 28 },
  box: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3f4b',
    backgroundColor: '#f5f6f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderWidth: 1.5,
    borderColor: '#0a5ce8',
    backgroundColor: '#ffffff',
  },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#0a5ce8' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  error: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 24,
  },
  forgot: { marginTop: 18, paddingVertical: 4 },
  forgotText: { color: '#0a5ce8', fontSize: 15, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  button: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#0a5ce8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
