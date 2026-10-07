import { router, Stack } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Metro bundles this static Figma asset at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const landmarks = require('../assets/figma/onboarding-landmarks.png');

export default function Onboarding() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={landmarks}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.content}>
          <View style={styles.spacer} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/connect')}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/connect')}
            style={styles.signIn}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInAccent}>Sign In</Text>
            </Text>
          </Pressable>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#001638' },
  background: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 32, paddingBottom: 12 },
  spacer: { flex: 1 },
  button: {
    backgroundColor: '#005ae1',
    borderRadius: 40,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  signIn: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  signInText: { color: '#061a42', fontSize: 14, fontWeight: '600' },
  signInAccent: { color: '#fff' },
});
