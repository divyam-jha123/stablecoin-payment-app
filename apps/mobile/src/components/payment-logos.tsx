import { Text, View } from 'react-native';
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

export function UsdtTokenEmblem({ size = 44 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#26A17B',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        accessible={false}
      >
        <Path d="M4.5 4.5h15v3.2h-5.8v12.8h-3.4V7.7H4.5z" fill="#ffffff" />
        <Path
          d="M4 11.2c0 1.2 3.6 2.1 8 2.1s8-.9 8-2.1-3.6-2.1-8-2.1-8 .9-8 2.1z"
          stroke="#ffffff"
          strokeWidth={1.4}
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

// Brand colours for tokens without a dedicated emblem.
const TOKEN_COLORS: Record<string, string> = { pathUSD: '#081332' };

/**
 * Emblem for whichever token a payment uses. Payments can convert to any
 * supported token, so screens should use this rather than a fixed emblem.
 */
export function TokenEmblem({
  symbol,
  size = 44,
}: {
  symbol: string;
  size?: number;
}) {
  if (symbol === 'USDC') return <UsdcTokenEmblem size={size} />;
  if (symbol === 'USDT') return <UsdtTokenEmblem size={size} />;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: TOKEN_COLORS[symbol] ?? '#2f6bff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{ color: '#ffffff', fontSize: size * 0.46, fontWeight: '800' }}
      >
        {symbol.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
