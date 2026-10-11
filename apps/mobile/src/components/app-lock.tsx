import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { shouldRelock } from '../features/account/app-lock-policy';
import { authenticate, phoneHasLock } from '../features/account/device-lock';
import { walletStore } from '../features/account/metamask';
import {
  isValidPin,
  PIN_LENGTH,
  pinStore,
  type PinCheck,
} from '../features/account/payment-pin';
import { pinOwner } from '../features/account/pin-owner';
import {
  securityPreferences,
  unlockMethod,
  type UnlockMethod,
} from '../features/account/security-preferences';
import { recordLoginActivity } from '../features/account/login-activity-store';
import {
  entryRoute,
  hasReturningUser,
} from '../features/account/returning-user';
import { SplashBackdrop, SPLASH_DURATION_MS } from './splash-backdrop';

function pinFailure(check: Exclude<PinCheck, { ok: true }>) {
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

/** How this phone unlocks TravelPe, from the Security screen's settings. */
async function currentUnlockMethod(): Promise<UnlockMethod> {
  const owner = pinOwner();
  const [preferences, hasPin] = await Promise.all([
    securityPreferences.load(),
    owner ? pinStore.hasPin(owner).catch(() => false) : false,
  ]);
  return unlockMethod(preferences, hasPin);
}

/**
 * After the splash, App Lock asks for the phone's fingerprint, face or
 * passcode, or for the TravelPe PIN when biometrics are off in Security.
 */
export function AppLock() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [phase, setPhase] = useState<
    'splash' | 'authenticate' | 'pin' | 'open' | 'error'
  >('splash');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const returnHome = useRef(true);
  const destination = useRef<'/home' | '/pin-setup'>('/home');
  const prompting = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const mounted = useRef(true);
  const splashReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = useCallback((home: boolean) => {
    returnHome.current = home;
    setReady(false);
    setError(null);
    setPin('');
    setPhase('splash');
    setAttempt((value) => value + 1);
  }, []);

  // Visiting Splash from the preview menu repeats the real entry flow.
  useEffect(() => {
    if (pathname === '/' && previousPath.current !== '/') start(true);
    previousPath.current = pathname;
  }, [pathname, start]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void entryRoute()
        .then(async (route) => {
          if (cancelled) return;
          if (route !== '/onboarding') {
            destination.current = route;
            // Have Home's local account ready before the device prompt closes.
            // Its backend session check can continue after Home opens.
            await walletStore.restoreRemembered();
            void walletStore.refresh();
            const method = await currentUnlockMethod();
            if (cancelled) return;
            if (method === 'none') {
              setPhase('open');
              if (returnHome.current) router.replace(destination.current);
            } else setPhase(method === 'pin' ? 'pin' : 'authenticate');
          } else {
            setPhase('open');
            if (returnHome.current) router.replace('/onboarding');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not load your sign-in. Please try again.');
            setPhase('error');
          }
        });
    }, SPLASH_DURATION_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, attempt]);

  const opened = useCallback(() => {
    recordLoginActivity('unlock');
    setPin('');
    setPhase('open');
    if (returnHome.current) router.replace(destination.current);
  }, []);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setError(null);
    try {
      if (!(await phoneHasLock())) {
        if (mounted.current)
          setError(
            'Set up a screen lock in your phone settings, then try again.',
          );
        return;
      }
      const success = await authenticate('Sign in to TravelPe');
      if (!mounted.current) return;
      if (success) opened();
      else
        setError('Use your phone’s fingerprint, face or passcode to continue.');
    } catch {
      if (mounted.current)
        setError('Could not open device authentication. Please try again.');
    } finally {
      prompting.current = false;
    }
  }, [opened]);

  useEffect(() => {
    if (phase === 'authenticate') void unlock();
  }, [phase, unlock]);

  const checkPin = useCallback(
    async (digits: string) => {
      const owner = pinOwner();
      if (!owner || !isValidPin(digits) || prompting.current) return;
      prompting.current = true;
      setCheckingPin(true);
      setError(null);
      try {
        const check = await pinStore.verify(owner, digits);
        if (!mounted.current) return;
        if (check.ok) opened();
        else {
          setError(pinFailure(check));
          setPin('');
        }
      } catch {
        if (mounted.current) {
          setError('Could not check your PIN. Please try again.');
          setPin('');
        }
      } finally {
        prompting.current = false;
        if (mounted.current) setCheckingPin(false);
      }
    },
    [opened],
  );

  useEffect(() => {
    let disposed = false;
    let check = 0;
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        check++;
        backgroundedAt.current ??= Date.now();
      } else if (state === 'active') {
        const away = backgroundedAt.current;
        backgroundedAt.current = null;
        if (phase !== 'open' || !shouldRelock(away, Date.now())) return;
        const request = ++check;
        // Read setup and App Lock again: either may have changed since launch.
        void Promise.all([hasReturningUser(), securityPreferences.load()])
          .then(([returning, preferences]) => {
            if (
              !disposed &&
              request === check &&
              returning &&
              preferences.appLock
            )
              start(false);
          })
          .catch(() => {
            // Keep the splash covering content while a storage error is retried.
            if (!disposed && request === check) start(false);
          });
      }
    });
    return () => {
      disposed = true;
      listener.remove();
    };
  }, [phase, pathname, start]);

  if (phase === 'open') return null;
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <SplashBackdrop key={attempt} onReady={splashReady} />
      {phase === 'pin' ? (
        <View style={styles.pinArea}>
          <Text accessibilityRole="header" style={styles.pinTitle}>
            Enter your PIN to unlock
          </Text>
          <View
            accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}
            style={styles.pinBoxes}
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.pinBox,
                  index === pin.length && styles.pinBoxActive,
                ]}
              >
                {index < pin.length ? <View style={styles.pinDot} /> : null}
              </View>
            ))}
            <TextInput
              value={pin}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
                setError(null);
                setPin(digits);
                if (digits.length === PIN_LENGTH) void checkPin(digits);
              }}
              editable={!checkingPin}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              autoFocus
              caretHidden
              secureTextEntry
              autoComplete="off"
              importantForAutofill="no"
              contextMenuHidden
              style={styles.pinInput}
              accessibilityLabel="TravelPe PIN"
            />
          </View>
          {checkingPin ? (
            <ActivityIndicator
              accessibilityLabel="Checking PIN"
              color="#ffffff"
            />
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => void unlock()}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.pinSwitch}>Use phone unlock instead</Text>
          </Pressable>
        </View>
      ) : error ? (
        <View style={styles.retryArea}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              phase === 'error' ? start(returnHome.current) : void unlock()
            }
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>Continue</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: '#000000',
  },
  retryArea: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    gap: 16,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  retry: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  retryText: { color: '#081332', fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  pinArea: {
    position: 'absolute',
    top: '38%',
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 20,
  },
  pinTitle: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  pinBoxes: { flexDirection: 'row', gap: 16 },
  pinBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxActive: { borderWidth: 1.5, borderColor: '#ffffff' },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
  },
  pinInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    opacity: 0.02,
  },
  pinSwitch: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
