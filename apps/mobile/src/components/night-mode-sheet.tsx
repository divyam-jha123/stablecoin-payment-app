import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from './bottom-sheet';
import { Action, AppIcon, colors } from './payment-ui';
import { themeStore } from '../features/appearance/theme-preferences-store';
import type { ThemePreferences } from '../features/appearance/theme-preferences';
import { formatHour, isNight, nightHours } from '../theme/color-scheme';
import { tc, themedStyleSheet } from '../theme/themed';

const BLUE = '#2f6bff';
const INK = '#081332';

const PRESETS: readonly { start: number; end: number }[] = [
  { start: 18, end: 6 },
  { start: 19, end: 7 },
  { start: 20, end: 6 },
  { start: 22, end: 6 },
];

const wrapHour = (hour: number) => (hour + 24) % 24;

function HourStepper({
  label,
  hour,
  onChange,
}: {
  label: string;
  hour: number;
  onChange: (hour: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, one hour earlier`}
          hitSlop={6}
          onPress={() => onChange(wrapHour(hour - 1))}
          style={({ pressed }) => [
            styles.stepButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.stepSign}>−</Text>
        </Pressable>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${label} ${formatHour(hour)}`}
          style={styles.stepValue}
        >
          {formatHour(hour)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, one hour later`}
          hitSlop={6}
          onPress={() => onChange(wrapHour(hour + 1))}
          style={({ pressed }) => [
            styles.stepButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.stepSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Bottom sheet for the Night Mode schedule: the hours TravelPe is dark.
 * Saving turns Auto Theme on with those hours.
 */
export function NightModeSheet({
  visible,
  preferences,
  onClose,
}: {
  visible: boolean;
  preferences: ThemePreferences;
  onClose: () => void;
}) {
  const [start, setStart] = useState(preferences.nightStart);
  const [end, setEnd] = useState(preferences.nightEnd);

  // Start from the saved schedule each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setStart(preferences.nightStart);
    setEnd(preferences.nightEnd);
  }, [visible, preferences.nightStart, preferences.nightEnd]);

  const valid = start !== end;
  const darkNow = valid && isNight(new Date().getHours(), start, end);

  function save() {
    if (!valid) return;
    themeStore.update({ autoTheme: true, nightStart: start, nightEnd: end });
    onClose();
  }

  function turnOff() {
    themeStore.update({ autoTheme: false });
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      title="Night Mode"
      subtitle="TravelPe turns dark during these hours and light the rest of the day."
      onClose={onClose}
    >
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const selected = preset.start === start && preset.end === end;
          return (
            <Pressable
              key={`${preset.start}-${preset.end}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setStart(preset.start);
                setEnd(preset.end);
              }}
              style={({ pressed }) => [
                styles.preset,
                selected && styles.presetSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  selected && styles.presetTextSelected,
                ]}
              >
                {formatHour(preset.start)} – {formatHour(preset.end)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <HourStepper label="Dark from" hour={start} onChange={setStart} />
        <View style={styles.divider} />
        <HourStepper label="Light from" hour={end} onChange={setEnd} />
      </View>

      <View style={styles.status}>
        <AppIcon
          name={valid ? 'check' : 'help'}
          size={16}
          color={tc(valid ? BLUE : colors.error)}
        />
        <Text style={[styles.statusText, !valid && styles.statusError]}>
          {valid
            ? `Dark ${nightHours(start, end)}. ${darkNow ? 'Dark' : 'Light'} right now.`
            : 'Pick different times for dark and light.'}
        </Text>
      </View>

      <Action
        title={preferences.autoTheme ? 'Save schedule' : 'Turn on Night Mode'}
        onPress={save}
        disabled={!valid}
      />
      {preferences.autoTheme ? (
        <Action title="Turn off" secondary onPress={turnOff} />
      ) : null}
    </BottomSheet>
  );
}

const styles = themedStyleSheet({
  pressed: { opacity: 0.7 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d3deef',
    backgroundColor: '#f4f8ff',
  },
  presetSelected: { borderColor: BLUE, backgroundColor: '#e3edff' },
  presetText: { color: INK, fontSize: 14, fontWeight: '600' },
  presetTextSelected: { color: BLUE },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1e8f3',
    backgroundColor: '#f7f9fd',
    paddingHorizontal: 14,
  },
  divider: { height: 1, backgroundColor: '#e6ebf3' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  stepperLabel: { color: INK, fontSize: 17, fontWeight: '700' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6edf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { color: INK, fontSize: 22, fontWeight: '600', lineHeight: 26 },
  stepValue: {
    minWidth: 64,
    textAlign: 'center',
    color: INK,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { flex: 1, color: colors.muted, fontSize: 14 },
  statusError: { color: colors.error },
});
