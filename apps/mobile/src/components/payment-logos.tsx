import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function StarbucksLogo({ size = 52 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#00704A',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size * 0.72} height={size * 0.72} viewBox="0 0 24 24">
        <Path
          d="M12 2l1.1 2.6L16 5l-2 2 .5 2.8-2.5-1.4L9.5 9.8l.5-2.8-2-2 2.9-.4L12 2z"
          fill="#ffffff"
        />
        <Path
          d="M5.5 12.5c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5M8.5 13a3.5 3.5 0 0 0 7 0"
          stroke="#ffffff"
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={12} cy={14.2} r={1.2} fill="#ffffff" />
      </Svg>
    </View>
  );
}

export function UsdcTokenEmblem({ size = 44 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#2775CA',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={size * 0.64}
        height={size * 0.64}
        viewBox="0 0 24 24"
        accessible={false}
      >
        <Path
          d="M6.5 6.8C4.9 8.3 4 10.5 4 13c0 2.5.9 4.7 2.5 6.2M17.5 6.8c1.6 1.5 2.5 3.7 2.5 6.2 0 2.5-.9 4.7-2.5 6.2"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M12 4.5v15M14.5 9.5c0-1.4-1.1-2-2.5-2h-1c-1.1 0-2 .9-2 2 0 2.2 4.5 1.8 4.5 4 0 1.1-.9 2-2 2h-1.5c-1.4 0-2.5-.9-2.5-2"
          stroke="#ffffff"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function IndiaFlagEmblem({ size = 44 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ffffff',
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 30 30" accessible={false}>
        <Rect x={0} y={0} width={30} height={10} fill="#FF9933" />
        <Rect x={0} y={10} width={30} height={10} fill="#ffffff" />
        <Rect x={0} y={20} width={30} height={10} fill="#138808" />
        <Circle
          cx={15}
          cy={15}
          r={3.6}
          stroke="#000080"
          strokeWidth={0.9}
          fill="none"
        />
        <Circle cx={15} cy={15} r={0.9} fill="#000080" />
      </Svg>
    </View>
  );
}
