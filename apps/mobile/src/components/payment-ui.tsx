import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

export const colors = {
  surface: '#ffffff',
  ink: '#081332',
  muted: '#5b6b85',
  line: '#dce7f7',
  accent: '#005ae1',
  error: '#a92c24',
};

export function PaymentScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={ui.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={ui.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        disabled && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      <Text style={[ui.buttonText, secondary && ui.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function ScanIcon({
  color = colors.accent,
  size = 32,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M3 11V3h8M21 3h8v8M29 21v8h-8M11 29H3v-8"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Rect
        x={9}
        y={9}
        width={5}
        height={5}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Rect x={19} y={9} width={4} height={5} fill={color} />
      <Path
        d="M9 19h5v4H9zM19 18v5h5v-3"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

export function AppIcon({
  name,
  color = colors.ink,
  size = 24,
}: {
  name:
    | 'home'
    | 'wallet'
    | 'activity'
    | 'person'
    | 'plus'
    | 'arrow'
    | 'back'
    | 'send'
    | 'receive';
  color?: string;
  size?: number;
}) {
  const paths: Record<typeof name, string> = {
    home: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
    wallet: 'M3 6h17v13H3z M3 9h17 M16 14h4',
    activity: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
    person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3-6 8-6s8 2 8 6',
    plus: 'M12 4v16 M4 12h16',
    arrow: 'M4 12h16 M14 6l6 6-6 6',
    back: 'M20 12H4 M10 6l-6 6 6 6',
    send: 'M4 19 20 4l-4 16-4-7-8 6z',
    receive: 'M12 3v14 M6 11l6 6 6-6 M4 21h16',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TestNotice() {
  return (
    <View style={ui.notice}>
      <Text style={ui.noticeTitle}>Development mode · Tempo testnet</Text>
      <Text style={ui.caption}>
        pathUSD test funds have no monetary value. INR settlement is simulated;
        no merchant receives INR.
      </Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 24,
    gap: 24,
  },
  brand: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 32, lineHeight: 39, fontWeight: '700' },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '600' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  caption: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.error, fontSize: 15, lineHeight: 22 },
  button: {
    minHeight: 56,
    padding: 16,
    backgroundColor: colors.accent,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryText: { color: colors.ink },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  notice: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 20,
    gap: 6,
  },
  noticeTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  group: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
});
