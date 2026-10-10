import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const BLUE = '#0088ff';
export const SPLASH_DURATION_MS = 2200;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const splashGlow = require('../../assets/splash-glow.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const outfitFont = require('../../assets/Outfit-Regular.ttf');

export function SplashBackdrop({ onReady }: { onReady?: () => void }) {
  const { height, width } = useWindowDimensions();
  const [fontLoaded, fontError] = useFonts({ Outfit: outfitFont });
  useEffect(() => {
    if (!fontLoaded && !fontError) return;
    SplashScreen.hide();
    onReady?.();
  }, [fontLoaded, fontError, onReady]);
  const version = Constants.expoConfig?.version ?? '0.0.1';

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="stretch"
        source={splashGlow}
        style={{
          height: width * 2,
          left: -width / 2,
          position: 'absolute',
          top: height / 2,
          width: width * 2,
        }}
      />
      {fontLoaded ? (
        <>
          <View style={[styles.brand, { top: height * 0.475 }]}>
            <Text style={styles.wordmark}>
              Travel<Text style={styles.blue}>Pe</Text>
            </Text>
            <Text style={styles.tagline}>Scan & Pay</Text>
          </View>
          <Text style={styles.version}>Version:{version}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#000000',
    flex: 1,
    overflow: 'hidden',
  },
  brand: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  wordmark: {
    color: '#ffffff',
    fontFamily: 'Outfit',
    fontSize: 40,
    includeFontPadding: false,
    lineHeight: 48,
  },
  blue: { color: BLUE },
  tagline: {
    color: '#ffffff',
    fontFamily: 'Outfit',
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 20,
  },
  version: {
    alignSelf: 'center',
    bottom: 50,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Outfit',
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 20,
    position: 'absolute',
  },
});
