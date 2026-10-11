import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable } from 'react-native';
import { AppIcon } from './payment-ui';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';

export const searchHints = [
  'Search contacts, UPI IDs, merchants...',
  'Type or Speak Here',
] as const;

const HINT_MS = 3000;
const FADE_MS = 220;

/**
 * Cycles the search placeholder between the hints. Returns the current hint
 * and an opacity that fades between them (instant under Reduce Motion).
 */
export function useRotatingHint(paused = false) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      reduceMotion.current = reduce;
    });
  }, []);

  useEffect(() => {
    if (paused) return;
    const next = () =>
      setIndex((current) => (current + 1) % searchHints.length);
    const timer = setInterval(() => {
      if (reduceMotion.current) return next();
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        next();
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, HINT_MS);
    return () => {
      clearInterval(timer);
      opacity.stopAnimation();
      opacity.setValue(1);
    };
  }, [paused, opacity]);

  return { hint: searchHints[index]!, opacity };
}

export function HomeSearchBar({
  onPress,
  onVoice,
  disabled = false,
}: {
  onPress: () => void;
  onVoice: () => void;
  disabled?: boolean;
}) {
  const { hint, opacity } = useRotatingHint(disabled);
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Search contacts, UPI IDs, merchants"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bar,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <AppIcon name="search" size={20} color={tc(theme.colors.muted)} />
      <Animated.Text
        style={[styles.placeholder, { opacity }]}
        numberOfLines={1}
      >
        {hint}
      </Animated.Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voice search"
        disabled={disabled}
        onPress={onVoice}
        hitSlop={12}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <AppIcon name="mic" size={20} color={tc(theme.colors.muted)} />
      </Pressable>
    </Pressable>
  );
}

const styles = themedStyleSheet({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.touchTarget,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.surface,
    borderWidth: 1,
    borderColor: theme.colors.balanceOutline,
    backgroundColor: '#f4f8ff',
  },
  placeholder: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.searchHint,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
