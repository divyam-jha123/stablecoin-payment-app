import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Pale wash from white at the top to light blue, behind Profile screens. */
export function ProfileBackdrop() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id="profile-wash" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#fbfcff" />
          <Stop offset="0.55" stopColor="#eef4fe" />
          <Stop offset="1" stopColor="#d6e5fd" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#profile-wash)" />
    </Svg>
  );
}
