import { Image, Text, View } from 'react-native';
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

// MetaMask fox, with its white backdrop removed so it sits on any button.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const metamaskFox = require('../../assets/logos/metamask.png');
const METAMASK_RATIO = 192 / 185;

export function MetaMaskLogo({ size = 24 }: { size?: number }) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={metamaskFox}
      resizeMode="contain"
      style={{ width: size, height: size / METAMASK_RATIO }}
    />
  );
}

// Four-colour Google "G".
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="4 4 40 40">
      <Path
        fill="#fbbc05"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#ea4335"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#34a853"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#4285f4"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}
