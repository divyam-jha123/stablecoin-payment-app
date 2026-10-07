import { router, Stack } from 'expo-router';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors } from '../src/components/payment-ui';

// Metro bundles these static Figma illustrations at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const skyline = require('../assets/figma/processing-skyline.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const token = require('../assets/figma/processing-token.png');

export default function Processing() {
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={skyline}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.back}
          >
            <AppIcon name="back" />
          </Pressable>
          <View style={styles.main}>
            <Text style={styles.title}>Payment setup</Text>
            <Text style={styles.subtitle}>Tempo Moderato testnet</Text>
            <Image source={token} resizeMode="contain" style={styles.token} />
          </View>
          <View style={styles.card}>
            <View style={styles.ring}>
              <AppIcon name="wallet" color={colors.accent} size={34} />
            </View>
            <Text style={styles.cardTitle}>
              Processing is not available yet
            </Text>
            <Text style={styles.cardCopy}>
              You can scan a merchant QR and review the amount. Payment
              submission is still being built, so no funds have moved.
            </Text>
            <View style={styles.steps}>
              <Text style={styles.stepActive}>1 Review</Text>
              <Text style={styles.step}>2 Settle</Text>
              <Text style={styles.step}>3 Confirm</Text>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e8f3ff' },
  background: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  back: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14 },
  token: { width: 230, height: 220, marginTop: 26 },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 25,
    alignItems: 'center',
    gap: 12,
  },
  ring: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#dceeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  steps: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 8,
  },
  step: {
    borderColor: '#bdcce1',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
  },
  stepActive: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    textAlign: 'center',
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
