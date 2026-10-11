import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

/**
 * "Set your payment PIN" intro. Shown after Google signup, or
 * before the first payment for a traveller who has no PIN yet. `next` and the
 * payment details pass through to the PIN entry screen.
 */
export default function PinSetup() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const params = useLocalSearchParams<Record<string, string>>();
  // During onboarding there is nowhere sensible to go back to.
  const canGoBack = params.next !== undefined && params.next !== 'onboarding';

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <AppIcon name="chevron-left" size={22} color={tc(colors.ink)} />
          </Pressable>
        ) : null}
        <Text style={styles.brand}>TravelPe</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.badge}>
          <AppIcon name="lock" size={64} color={tc('#0a5ce8')} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Set your payment PIN
        </Text>
        <Text style={styles.copy}>
          Create a 4-digit PIN to approve payments with TravelPe.
        </Text>
        <Text style={styles.hint}>Keep it private. Never share your PIN.</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/pin-entry',
              params: { ...params, mode: 'create' },
            })
          }
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Set PIN</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
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
  brand: { color: '#000000', fontSize: 22, fontWeight: '800' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  badge: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#edf4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 36,
  },
  copy: {
    color: '#333a45',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 300,
  },
  hint: {
    color: '#7a8496',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 64,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  button: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#0a5ce8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
