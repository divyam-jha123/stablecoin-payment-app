import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from './payment-ui';
import { shouldRelock } from '../features/account/app-lock-policy';
import { authenticate, phoneHasLock } from '../features/account/device-lock';
import { rememberedAccount } from '../features/account/remembered-account';

/**
 * Locks TravelPe behind the phone's fingerprint, face or PIN for a returning
 * traveller: when the app opens already signed in, and in that session on
 * returning after 30 seconds or more in the background. A first visit
 * (onboarding and connecting) is never locked. A phone with no screen lock
 * has nothing to check, so the app stays open. Mounted once, above every
 * screen.
 */
export function AppLock() {
  const [locked, setLocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const prompting = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  // Set only when the app opened already signed in, so a first visit, where
  // the traveller onboards and connects, is never locked.
  const returningSession = useRef(false);

  const lockIfProtected = useCallback(async () => {
    if (
      returningSession.current &&
      rememberedAccount.signedIn() &&
      (await phoneHasLock().catch(() => false))
    )
      setLocked(true);
  }, []);

  // Launch: lock if someone signed in on this phone before.
  useEffect(() => {
    void rememberedAccount.load().then((address) => {
      returningSession.current = Boolean(address);
      return lockIfProtected();
    });
  }, [lockIfProtected]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      // Only a real trip away counts; 'inactive' also fires for the unlock
      // prompt itself on iOS.
      if (state === 'background') {
        backgroundedAt.current ??= Date.now();
      } else if (state === 'active') {
        const away = backgroundedAt.current;
        backgroundedAt.current = null;
        if (shouldRelock(away, Date.now())) void lockIfProtected();
      }
    });
    return () => listener.remove();
  }, [lockIfProtected]);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    setFailed(false);
    try {
      if (await authenticate('Unlock TravelPe')) setLocked(false);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      prompting.current = false;
    }
  }, []);

  // Ask straight away whenever the app locks.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  if (!locked) return null;
  return (
    <View
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={styles.overlay}
    >
      <SafeAreaView style={styles.content}>
        <Text style={styles.wordmark}>
          Travel<Text style={styles.blue}>Pe</Text>
        </Text>
        <View style={styles.center}>
          <View style={styles.badge}>
            <AppIcon name="lock" size={40} color="#ffffff" />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            TravelPe is locked
          </Text>
          <Text style={styles.copy}>
            Use your fingerprint, face or phone PIN to continue.
          </Text>
          {failed ? (
            <Text accessibilityRole="alert" style={styles.failed}>
              Not unlocked. Try again.
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void unlock()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <AppIcon name="lock" size={20} color="#081332" />
          <Text style={styles.buttonText}>Unlock</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: '#081332',
  },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  wordmark: { color: '#ffffff', fontSize: 17, marginTop: 16 },
  blue: { color: '#0088ff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#005ae1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 24,
  },
  copy: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  failed: { color: '#ffb4ab', fontSize: 14, marginTop: 14 },
  button: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#081332', fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
