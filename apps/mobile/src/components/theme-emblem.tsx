import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

/** Rainbow disc with a palette and brush, for theme and accent rows. */
export function ThemeEmblem({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="themeHue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ff7eb3" />
          <Stop offset="0.3" stopColor="#ffb86b" />
          <Stop offset="0.5" stopColor="#ffe066" />
          <Stop offset="0.7" stopColor="#6ee7b7" />
          <Stop offset="1" stopColor="#7aa8ff" />
        </LinearGradient>
        <RadialGradient id="themeGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={24} cy={24} r={24} fill="url(#themeHue)" />
      <Circle cx={24} cy={24} r={24} fill="url(#themeGlow)" />
      <Path
        d="M23 12c-6.6 0-12 4.9-12 11s4.6 11 10.5 11c1.6 0 2.5-1 2.5-2.2 0-.7-.3-1.2-.7-1.7-.4-.4-.7-1-.7-1.6 0-1.3 1.1-2.3 2.4-2.3h2.8c4.1 0 7.2-3 7.2-6.8C35 15.8 29.6 12 23 12z"
        fill="#c9b8ff"
        stroke="#6a4be0"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={17} cy={20} r={2.2} fill="#e5484d" />
      <Circle cx={22.5} cy={16.8} r={2.2} fill="#ffb020" />
      <Circle cx={28.5} cy={18} r={2.2} fill="#22a35a" />
      <Circle cx={16.5} cy={26.5} r={2.2} fill="#2f6bff" />
      <Path
        d="M38 13 29.5 24.5"
        stroke="#6a4be0"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path
        d="M29.5 24.5c-1.8.2-3 1.6-2.8 3.6 2.2.1 3.8-.9 3.9-2.6z"
        fill="#ff7eb3"
        stroke="#6a4be0"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
