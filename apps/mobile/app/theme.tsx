import { useState } from 'react';
import { router, Stack } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { AppIcon, colors } from '../src/components/payment-ui';
import { ThemeEmblem } from '../src/components/theme-emblem';
import { Toggle } from '../src/components/toggle';
import {
  themeStore,
  useThemePreferences,
} from '../src/features/appearance/theme-preferences-store';
import {
  fontSizeOption,
  type ThemeMode,
} from '../src/features/appearance/theme-preferences';
import { tc, themedStyleSheet } from '../src/theme/themed';
import { useScheme } from '../src/theme/color-scheme-store';
import { isNight, nightHours } from '../src/theme/color-scheme';
import { NightModeSheet } from '../src/components/night-mode-sheet';
import { FontSizeSheet } from '../src/components/font-size-sheet';

const BLUE = '#2f6bff';
const INK = '#081332';

const MODES: readonly { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

// Outline icons on a 24px grid.
const ICONS = {
  back: 'M15 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  iconPack:
    'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2.5v2.5H14z M17.5 17.5H20V20h-2.5z M17.5 14H20 M14 20h2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5V12l3 2',
  nightMode:
    'M12 7a5 5 0 1 0 0 10z M12 7a5 5 0 0 1 0 10 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
} as const;

// Tiny app icons on the phone previews, in rows of four.
const APP_TINTS = [
  '#4cb3ff',
  '#ff9f0a',
  '#34c759',
  '#ff375f',
  '#5e5ce6',
  '#ffd60a',
  '#64d2ff',
  '#bf5af2',
  '#ff453a',
  '#30d158',
  '#0a84ff',
  '#ff9f0a',
] as const;
const DOCK_TINTS = ['#34c759', '#0a84ff', '#30d158', '#ff375f'] as const;

function Glyph({
  d,
  color,
  size = 24,
}: {
  d: string;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={tc(color)}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** A small home-screen phone, drawn for each interface style. */
function PhonePreview({ mode }: { mode: ThemeMode }) {
  const dark = mode === 'dark';
  return (
    <View style={styles.phone}>
      <View
        style={[
          styles.phoneScreen,
          { backgroundColor: dark ? '#1c1c1e' : '#f2f4f8' },
        ]}
      >
        {mode === 'system' ? (
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox="0 0 10 20"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="wallpaper" x1="0" y1="0" x2="0.4" y2="1">
                <Stop offset="0" stopColor="#ffb347" />
                <Stop offset="0.45" stopColor="#ff5e7e" />
                <Stop offset="1" stopColor="#3a6bff" />
              </LinearGradient>
            </Defs>
            <Rect width={10} height={20} fill="url(#wallpaper)" />
          </Svg>
        ) : null}
        <View style={styles.notch} />
        <View style={styles.widgets}>
          <View style={[styles.widget, { backgroundColor: '#5ac8fa' }]} />
          <View
            style={[
              styles.widget,
              { backgroundColor: dark ? '#2c2c2e' : '#ffffff' },
            ]}
          />
        </View>
        <View style={styles.apps}>
          {APP_TINTS.map((tint, index) => (
            <View key={index} style={[styles.app, { backgroundColor: tint }]} />
          ))}
        </View>
        <View
          style={[
            styles.dock,
            {
              backgroundColor: dark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(255,255,255,0.6)',
            },
          ]}
        >
          {DOCK_TINTS.map((tint, index) => (
            <View key={index} style={[styles.app, { backgroundColor: tint }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Row({
  title,
  subtitle,
  icon,
  value,
  toggle,
  soon,
  last,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  value?: string;
  toggle?: boolean;
  /** Shows a Coming Soon pill in place of a value. */
  soon?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const isSwitch = toggle !== undefined;
  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityLabel={`${title}, ${subtitle}${soon ? ', coming soon' : value ? `, ${value}` : ''}`}
      accessibilityState={isSwitch ? { checked: toggle } : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon}
      <View style={[styles.rowBody, !last && styles.rowDivider]}>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.rowSubtitle}>
            {subtitle}
          </Text>
        </View>
        {isSwitch ? (
          <Toggle value={toggle} />
        ) : soon ? (
          <View style={styles.soon}>
            <Text style={styles.soonText}>Coming Soon</Text>
          </View>
        ) : (
          <View style={styles.trailing}>
            {value ? (
              <Text numberOfLines={1} style={styles.rowValue}>
                {value}
              </Text>
            ) : null}
            <Glyph d={ICONS.chevron} color={tc('#3d4c66')} size={20} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function IconDisc({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconDisc}>{children}</View>;
}

function comingSoon(title: string) {
  Alert.alert(title, `${title} options are coming soon.`);
}

export default function ThemeAppearance() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  const preferences = useThemePreferences();
  const { mode, fontSize, autoTheme, nightStart, nightEnd } = preferences;
  const [nightSheet, setNightSheet] = useState(false);
  const [fontSheet, setFontSheet] = useState(false);
  const schedule = nightHours(nightStart, nightEnd);
  const nightNow = isNight(new Date().getHours(), nightStart, nightEnd);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/profile')
            }
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Glyph d={ICONS.back} color={tc(INK)} size={28} />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            Theme & Appearance
          </Text>
          <View style={styles.back} />
        </View>

        <Text style={styles.sectionLabel}>Interface style</Text>
        <View accessibilityRole="radiogroup" style={styles.modes}>
          {MODES.map((option) => {
            const selected = mode === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${option.label} theme`}
                onPress={() => themeStore.update({ mode: option.id })}
                style={({ pressed }) => [
                  styles.mode,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.modeCard}>
                  <PhonePreview mode={option.id} />
                </View>
                <View style={styles.modeLabelRow}>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? (
                      <AppIcon name="check" size={13} color={tc('#ffffff')} />
                    ) : null}
                  </View>
                  <Text style={styles.modeLabel}>{option.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {autoTheme ? (
          <Text style={styles.note}>
            Auto Theme is on, so TravelPe is dark from {schedule} and light the
            rest of the day. Turn it off to use the style above.
          </Text>
        ) : null}

        <Text style={styles.sectionLabel}>Theme settings</Text>
        <View style={styles.group}>
          <Row
            title="App Accent"
            subtitle="Accent colour"
            value="Blue"
            icon={<ThemeEmblem size={46} />}
            onPress={() => comingSoon('App Accent')}
          />
          <Row
            title="Font Size"
            subtitle="Typography"
            value={fontSizeOption(fontSize).label}
            icon={
              <IconDisc>
                <Text style={styles.fontGlyph}>
                  <Text style={styles.fontGlyphSmall}>A</Text>A
                </Text>
              </IconDisc>
            }
            onPress={() => setFontSheet(true)}
          />
          <Row
            title="Icon Pack"
            subtitle="Icon style"
            soon
            last
            icon={
              <IconDisc>
                <Glyph d={ICONS.iconPack} color={tc(INK)} size={22} />
              </IconDisc>
            }
            onPress={() => comingSoon('Icon Pack')}
          />
        </View>

        <Text style={styles.sectionLabel}>Automation</Text>
        <View style={styles.group}>
          <Row
            title="Auto Theme"
            subtitle="Scheduled theme change"
            toggle={autoTheme}
            icon={
              <IconDisc>
                <Glyph d={ICONS.clock} color={tc(INK)} size={22} />
              </IconDisc>
            }
            onPress={() => themeStore.update({ autoTheme: !autoTheme })}
          />
          <Row
            title="Night Mode"
            subtitle={schedule}
            value={autoTheme ? (nightNow ? 'Active' : 'Scheduled') : 'Off'}
            last
            icon={
              <IconDisc>
                <Glyph d={ICONS.nightMode} color={tc(INK)} size={22} />
              </IconDisc>
            }
            onPress={() => setNightSheet(true)}
          />
        </View>
      </ScrollView>
      <DashboardNav current="/profile" />
      <FontSizeSheet
        visible={fontSheet}
        fontSize={fontSize}
        onClose={() => setFontSheet(false)}
      />
      <NightModeSheet
        visible={nightSheet}
        preferences={preferences}
        onClose={() => setNightSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  screen: { flex: 1, backgroundColor: '#eef4fe' },
  content: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginBottom: 8,
  },
  back: { width: 44, height: 44, justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    color: INK,
    fontSize: 22,
    fontWeight: '800',
  },
  sectionLabel: {
    color: INK,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, alignItems: 'center', gap: 10 },
  // Just the phone, no box around it; tall enough that the phone fits.
  modeCard: {
    width: '100%',
    aspectRatio: 0.72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#8b97ad',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: BLUE, borderColor: BLUE },
  modeLabel: { color: INK, fontSize: 17 },
  note: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    marginHorizontal: 4,
  },
  phone: {
    width: '68%',
    aspectRatio: 0.5,
    borderRadius: 12,
    padding: 2.5,
    backgroundColor: '#0b0b0f',
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
  },
  notch: {
    alignSelf: 'center',
    width: '34%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0b0b0f',
  },
  widgets: { flexDirection: 'row', gap: 3 },
  widget: { flex: 1, aspectRatio: 1, borderRadius: 4 },
  apps: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  app: { width: '21%', aspectRatio: 1, borderRadius: 2.5 },
  dock: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 2.5,
    borderRadius: 5,
  },
  group: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1e8f3',
    backgroundColor: '#ffffff',
    paddingLeft: 14,
    shadowColor: INK,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingRight: 14,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#e6ebf3' },
  rowCopy: { flex: 1, gap: 1 },
  rowTitle: { color: '#000000', fontSize: 17, fontWeight: '700' },
  rowSubtitle: { color: '#3d4c66', fontSize: 14 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rowValue: { color: '#3d4c66', fontSize: 16 },
  soon: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#e8effe',
    borderWidth: 1,
    borderColor: '#cddcfb',
  },
  soonText: { color: BLUE, fontSize: 12, fontWeight: '700' },
  iconDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e6edf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontGlyph: { color: INK, fontSize: 20, fontWeight: '500' },
  fontGlyphSmall: { fontSize: 14 },
});
