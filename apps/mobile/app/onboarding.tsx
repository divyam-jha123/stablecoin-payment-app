import { router, Stack } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppIcon } from '../src/components/payment-ui';
import { iosDashboardPreview } from '../src/ui-preview';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';

// Metro bundles this static Figma asset at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const landmarks = require('../assets/figma/onboarding-landmarks.webp');
const ART_WIDTH = 851;
const ART_HEIGHT = 1848;
// The artwork spans the screen width and is lifted so the globe's rim sits
// at GLOBE_TOP of the screen, as in the reference design.
const ART_GLOBE_RIM = 0.82;
const GLOBE_TOP = 0.72;
// The artwork has rounded bottom corners; it is cut off above them, where
// the globe shade has already covered it.
const ART_VISIBLE = 0.975;
// Night side of the globe, which also fills the screen below the artwork.
const GLOBE_NIGHT = '#1032a5';
// Tints over the artwork, as [screen fraction, opacity] stops: deepen the sky
// above the horizon, warm the sunset glow, turn the globe to its night side,
// and darken the very bottom behind the buttons.
const TINTS: { color: string; stops: [number, number][] }[] = [
  {
    color: '#041a5c',
    stops: [
      [0.33, 0],
      [0.45, 0.3],
      [0.52, 0.22],
      [0.56, 0],
    ],
  },
  {
    color: '#ff8a30',
    stops: [
      [0.5, 0],
      [0.58, 0.3],
      [0.66, 0.22],
      [0.715, 0],
    ],
  },
  {
    color: GLOBE_NIGHT,
    stops: [
      [0.745, 0],
      [0.78, 0.45],
      [0.83, 0.75],
      [0.86, 1],
    ],
  },
  {
    color: '#06123c',
    stops: [
      [0.86, 0],
      [1, 0.75],
    ],
  },
];

// Choose a sign-in method before setting up the payment PIN.
function start() {
  router.replace('/connect');
}

export default function Onboarding() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const { width, height } = useWindowDimensions();
  const artWidth = width;
  const artHeight = (ART_HEIGHT * width) / ART_WIDTH;
  const artTop = Math.min(0, GLOBE_TOP * height - ART_GLOBE_RIM * artHeight);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.art,
          {
            top: artTop,
            width: artWidth,
            height: artHeight * ART_VISIBLE,
          },
        ]}
      >
        <Image
          source={landmarks}
          resizeMode="stretch"
          style={{ width: artWidth, height: artHeight }}
        />
      </View>
      <Svg
        pointerEvents="none"
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {TINTS.map((tint, index) => (
            <LinearGradient
              key={tint.color}
              id={`onboarding-tint-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              {tint.stops.map(([offset, opacity]) => (
                <Stop
                  key={offset}
                  offset={offset}
                  stopColor={tc(tint.color, 'bg')}
                  stopOpacity={opacity}
                />
              ))}
            </LinearGradient>
          ))}
        </Defs>
        {TINTS.map((tint, index) => (
          <Rect
            key={tint.color}
            width={width}
            height={height}
            fill={tc(`url(#onboarding-tint-${index})`, 'auto')}
          />
        ))}
      </Svg>
      <SafeAreaView style={styles.content}>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            iosDashboardPreview ? router.replace('/home') : start()
          }
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>
            {iosDashboardPreview ? 'Continue to Dashboard' : 'Get Started'}
          </Text>
          <AppIcon name="arrow" size={24} color={tc('#ffffff')} />
        </Pressable>
        {!iosDashboardPreview ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void start()}
            style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInAccent}>Sign In</Text>
            </Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: GLOBE_NIGHT, overflow: 'hidden' },
  art: { position: 'absolute', left: 0, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: 32, paddingBottom: 4 },
  pressed: { opacity: 0.75 },
  spacer: { flex: 1 },
  button: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#3268f5',
    borderRadius: 34,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(160,200,255,0.35)',
  },
  buttonText: { color: '#fff', fontSize: 21, fontWeight: '700' },
  signIn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  signInText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  signInAccent: {
    color: '#7cc0ff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
