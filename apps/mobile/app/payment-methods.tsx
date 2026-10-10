import { useEffect, useRef, useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors, TestNotice } from '../src/components/payment-ui';
import { ProfileBackdrop } from '../src/components/profile-backdrop';
import { uiPreviewEnabled } from '../src/ui-preview';

// Metro bundles this static illustration at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const illustration = require('../assets/illustrations/coming-soon.jpg');

// The card hangs from one thread on a pin, like a picture on a nail.
const THREAD = 40;
const PIN = 12;
const PIN_TOP = 6;
// Matches the page padding, so the swinging card can use the full screen width.
const GUTTER = 18;
// Space kept on each side of the card at rest.
const SIDE_ROOM = 8;
// Space below the card for its shadow.
const BOTTOM_ROOM = 14;
// Thread drawn above the card's top edge; the clip hides it until it lowers.
const SPOOL = 1200;

function BackGlyph() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function PaymentMethods() {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const drop = useRef(new Animated.Value(0)).current;
  const angle = useRef(new Animated.Value(0)).current;

  const side = Math.max(
    0,
    Math.floor(
      Math.min(
        area.width - SIDE_ROOM * 2,
        area.height - PIN_TOP - THREAD - BOTTOM_ROOM,
      ),
    ),
  );
  const hang = THREAD + side;

  // Lowers on the thread from above, bounces, then swings and settles into a
  // slow sway. Starts once the card has a size, so the drop clears the screen.
  useEffect(() => {
    if (!side) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;
    const swing = (toValue: number, duration: number) =>
      Animated.timing(angle, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });
    drop.setValue(-hang);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        drop.setValue(0);
        return;
      }
      animation = Animated.sequence([
        Animated.timing(drop, {
          toValue: 0,
          duration: 950,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        swing(4, 650),
        swing(-3, 1200),
        swing(2.2, 1100),
        swing(-1.6, 1050),
        Animated.loop(Animated.sequence([swing(1.2, 1300), swing(-1.2, 1300)])),
      ]);
      animation.start();
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [angle, drop, hang, side]);

  const rotate = angle.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/profile')
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <BackGlyph />
        </Pressable>

        <View
          style={styles.hangingArea}
          onLayout={({ nativeEvent }) =>
            setArea({
              width: nativeEvent.layout.width,
              height: nativeEvent.layout.height,
            })
          }
        >
          {side > 0 ? (
            <>
              {/* Everything below the pin; the card lowers into view here. */}
              <View style={styles.clip}>
                <Animated.View
                  style={[
                    styles.hanger,
                    {
                      left: GUTTER + (area.width - side) / 2,
                      width: side,
                      height: hang,
                      // Turn about the pin at the top centre.
                      transform: [
                        { translateY: drop },
                        { translateY: -hang / 2 },
                        { rotate },
                        { translateY: hang / 2 },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.thread, { left: side / 2 - 1 }]} />
                  <View style={[styles.card, { width: side, height: side }]}>
                    <Animated.Image
                      source={illustration}
                      resizeMode="contain"
                      accessibilityLabel="A traveller asks if they can try this yet; the merchant, holding an hourglass, says it is almost ready. Coming soon."
                      style={styles.illustration}
                    />
                  </View>
                  <View style={[styles.eyelet, { left: side / 2 - 5 }]} />
                </Animated.View>
              </View>
              <View style={[styles.pin, { left: area.width / 2 - PIN / 2 }]} />
            </>
          ) : null}
        </View>

        {!uiPreviewEnabled ? <TestNotice /> : null}
      </ScrollView>
      <DashboardNav current="/profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef4fe' },
  content: {
    flexGrow: 1,
    paddingHorizontal: GUTTER,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 4,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  back: { width: 44, height: 44, justifyContent: 'center' },
  hangingArea: { flex: 1, minHeight: 340 },
  clip: {
    position: 'absolute',
    top: PIN_TOP,
    bottom: 0,
    left: -GUTTER,
    right: -GUTTER,
    overflow: 'hidden',
  },
  hanger: { position: 'absolute', top: 0 },
  thread: {
    position: 'absolute',
    top: -SPOOL,
    width: 2,
    height: SPOOL + THREAD + 4,
    borderRadius: 1,
    backgroundColor: '#7d8ca6',
  },
  card: {
    position: 'absolute',
    top: THREAD,
    left: 0,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d3deef',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#081332',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  // Small ring where the thread meets the card.
  eyelet: {
    position: 'absolute',
    top: THREAD - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#7d8ca6',
    backgroundColor: '#ffffff',
  },
  pin: {
    position: 'absolute',
    top: PIN_TOP - PIN / 2,
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#081332',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  // Source artwork is square.
  illustration: { width: '100%', height: '100%' },
});
