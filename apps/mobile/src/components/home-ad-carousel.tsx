import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export type HomeAd = {
  key: string;
  accessibilityLabel: string;
  onPress: () => void;
  content: ReactNode;
};

const AUTO_ADVANCE_MS = 3000;
const REWIND_DELAY_MS = 600;

/**
 * Home promo banners that slide right to left every three seconds. A copy of
 * the first ad sits after the last one so the loop never scrolls backwards.
 */
export function HomeAdCarousel({
  ads,
  disabled = false,
}: {
  ads: HomeAd[];
  disabled?: boolean;
}) {
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rewind = useRef<ReturnType<typeof setTimeout>>(undefined);
  const slides = ads.length > 1 ? [...ads, ads[0]!] : ads;

  useEffect(() => () => clearTimeout(rewind.current), []);

  useEffect(() => {
    if (!width || dragging || ads.length < 2) return;
    const timer = setTimeout(() => {
      const next = index + 1;
      scroller.current?.scrollTo({ x: next * width, animated: true });
      if (next === ads.length) {
        // Once the slide onto the copy has finished, jump back to the real one.
        rewind.current = setTimeout(
          () => scroller.current?.scrollTo({ x: 0, animated: false }),
          REWIND_DELAY_MS,
        );
      }
      setIndex(next % ads.length);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [ads.length, dragging, index, width]);

  function settle(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    if (page >= ads.length) {
      // Landed on the copy of the first ad: jump back to the real one.
      scroller.current?.scrollTo({ x: 0, animated: false });
      setIndex(0);
    } else {
      setIndex(page);
    }
  }

  return (
    <View style={styles.root}>
      <View
        style={styles.frame}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            clearTimeout(rewind.current);
            setDragging(true);
          }}
          onScrollEndDrag={() => setDragging(false)}
          onMomentumScrollEnd={settle}
        >
          {slides.map((ad, slide) => (
            <Pressable
              key={slide === ads.length ? `${ad.key}-loop` : ad.key}
              accessibilityRole="button"
              accessibilityLabel={ad.accessibilityLabel}
              accessibilityState={{ disabled }}
              accessibilityElementsHidden={slide === ads.length}
              importantForAccessibility={
                slide === ads.length ? 'no-hide-descendants' : 'auto'
              }
              disabled={disabled}
              onPress={ad.onPress}
              style={[styles.slide, { width }, disabled && styles.disabled]}
            >
              {ad.content}
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {ads.length > 1 ? (
        <View style={styles.dots}>
          {ads.map((ad, dot) => (
            <View
              key={ad.key}
              style={[styles.dot, dot === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  frame: {
    width: '100%',
    height: 116,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ebeeff',
  },
  slide: { height: '100%', overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c7d4f5',
  },
  dotActive: { width: 16, backgroundColor: '#005ae1' },
});
