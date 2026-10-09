import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { shouldRelock } from '../features/account/app-lock-policy';
import { authenticate, phoneHasLock } from '../features/account/device-lock';
import { walletStore } from '../features/account/metamask';
import { hasReturningUser } from '../features/account/returning-user';
import { SplashBackdrop, SPLASH_DURATION_MS } from './splash-backdrop';

/** The phone's native unlock prompt appears over the splash after it finishes. */
export function AppLock() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [phase, setPhase] = useState<
    'splash' | 'authenticate' | 'open' | 'error'
  >('splash');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const returnHome = useRef(true);
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
      void hasReturningUser()
        .then(async (returning) => {
          if (cancelled) return;
          if (returning) {
            // Have Home's local account ready before the device prompt closes.
            // Its backend session check can continue after Home opens.
            await walletStore.restoreRemembered();
            void walletStore.refresh();
            if (!cancelled) setPhase('authenticate');
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
      if (success) {
        setPhase('open');
        if (returnHome.current) router.replace('/home');
      } else
        setError('Use your phone’s fingerprint, face or passcode to continue.');
    } catch {
      if (mounted.current)
        setError('Could not open device authentication. Please try again.');
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    if (phase === 'authenticate') void unlock();
  }, [phase, unlock]);

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
        // Read setup again: it may have completed since this app launch.
        void hasReturningUser()
          .then((returning) => {
            if (!disposed && request === check && returning) start(false);
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
      {error ? (
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
});
