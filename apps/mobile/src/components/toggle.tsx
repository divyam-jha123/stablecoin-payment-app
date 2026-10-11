import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { themedStyleSheet } from '../theme/themed';

const BLUE = '#2f6bff';
const INK = '#081332';

// A thin track under a larger knob that overhangs it.
const TOGGLE_WIDTH = 50;
const TRACK = 18;
const KNOB = 28;

/**
 * A thin track with a larger round knob that overhangs it: pale blue track and
 * blue knob when on, grey track and white knob when off. Null shows it dimmed
 * while the value loads. The row around it handles presses.
 */
export function Toggle({ value }: { value: boolean | null }) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, value]);
  const on = { opacity: progress };
  return (
    <View style={[styles.toggle, value === null && styles.toggleLoading]}>
      <View style={styles.track}>
        <Animated.View style={[styles.trackOn, on]} />
      </View>
      <Animated.View
        style={[
          styles.knob,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, TOGGLE_WIDTH - KNOB],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.knobOn, on]} />
      </Animated.View>
    </View>
  );
}

const styles = themedStyleSheet({
  toggle: { width: TOGGLE_WIDTH, height: KNOB, justifyContent: 'center' },
  toggleLoading: { opacity: 0.5 },
  track: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: '#d5dbe6',
    overflow: 'hidden',
  },
  trackOn: { ...StyleSheet.absoluteFill, backgroundColor: '#a9c4fb' },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#ffffff',
    shadowColor: INK,
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  knobOn: {
    ...StyleSheet.absoluteFill,
    borderRadius: KNOB / 2,
    backgroundColor: BLUE,
  },
});
