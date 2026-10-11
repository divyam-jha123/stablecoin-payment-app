import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { AppIcon, colors } from './payment-ui';
import { BottomSheet } from './bottom-sheet';
import {
  dayKey,
  monthGrid,
  startOfDay,
} from '../features/payment/activity-dates';
import { tc, themedStyleSheet } from '../theme/themed';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Outline calendar with binder rings and pale day squares. */
export function CalendarIcon({ size = 24 }: { size?: number }) {
  const ink = tc(colors.ink);
  const day = tc('#cdd8f0');
  const squares = [
    [9.5, 12],
    [12.5, 12],
    [15.5, 12],
    [6.5, 15],
    [9.5, 15],
    [12.5, 15],
    [15.5, 15],
    [6.5, 18],
    [9.5, 18],
    [12.5, 18],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={3.5}
        y={5}
        width={17}
        height={15.5}
        rx={2.6}
        stroke={ink}
        strokeWidth={1.7}
        fill="none"
      />
      <Line
        x1={3.5}
        y1={9.2}
        x2={20.5}
        y2={9.2}
        stroke={ink}
        strokeWidth={1.7}
      />
      <Rect
        x={7.2}
        y={3}
        width={2}
        height={4}
        rx={1}
        stroke={ink}
        strokeWidth={1.4}
        fill={tc('#edf2fd')}
      />
      <Rect
        x={14.8}
        y={3}
        width={2}
        height={4}
        rx={1}
        stroke={ink}
        strokeWidth={1.4}
        fill={tc('#edf2fd')}
      />
      {squares.map(([x, y]) => (
        <Rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={2}
          height={2}
          rx={0.5}
          fill={day}
        />
      ))}
    </Svg>
  );
}

/** Long label for a picked day, such as "Sat, 11 Oct 2026". */
export function calendarDayLabel(day: number) {
  return new Date(day).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Month calendar in a bottom sheet. Days with transactions carry a dot;
 * future days cannot be picked.
 */
export function ActivityCalendarSheet({
  visible,
  selected,
  activeDays,
  onSelect,
  onClose,
}: {
  visible: boolean;
  /** Midnight of the picked day, or null for every date. */
  selected: number | null;
  /** `dayKey`s of days that have transactions. */
  activeDays: ReadonlySet<string>;
  onSelect: (day: number | null) => void;
  onClose: () => void;
}) {
  const today = startOfDay(Date.now());
  const [month, setMonth] = useState(() => new Date(selected ?? today));
  // Reopening starts on the picked day's month, or this month.
  useEffect(() => {
    if (visible) setMonth(new Date(selected ?? Date.now()));
  }, [visible, selected]);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const now = new Date(today);
  const atCurrentMonth =
    year === now.getFullYear() && monthIndex === now.getMonth();
  const monthLabel = month.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const shift = (by: number) => setMonth(new Date(year, monthIndex + by, 1));

  return (
    <BottomSheet
      visible={visible}
      title="Pick a date"
      subtitle="See the transactions from one day. Dotted days have activity."
      onClose={onClose}
    >
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shift(-1)}
          style={styles.monthButton}
        >
          <AppIcon name="chevron-left" size={20} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.monthLabel}>
          {monthLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: atCurrentMonth }}
          disabled={atCurrentMonth}
          onPress={() => shift(1)}
          style={[styles.monthButton, atCurrentMonth && styles.disabled]}
        >
          <AppIcon name="chevron-right" size={20} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {weekdays.map((label, index) => (
          <Text key={index} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {monthGrid(year, monthIndex).map((week, row) => (
          <View key={row} style={styles.week}>
            {week.map((day, column) => {
              if (day === null)
                return <View key={column} style={styles.cell} />;
              const future = day > today;
              const isSelected = day === selected;
              const isToday = day === today;
              const active = activeDays.has(dayKey(day));
              return (
                <Pressable
                  key={column}
                  accessibilityRole="button"
                  accessibilityLabel={`${calendarDayLabel(day)}${active ? ', has transactions' : ''}`}
                  accessibilityState={{
                    selected: isSelected,
                    disabled: future,
                  }}
                  disabled={future}
                  onPress={() => {
                    onSelect(day);
                    onClose();
                  }}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.day,
                      isToday && styles.today,
                      isSelected && styles.selected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        future && styles.futureText,
                        isSelected && styles.selectedText,
                      ]}
                    >
                      {new Date(day).getDate()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.dot,
                      active && styles.dotOn,
                      active && isSelected && styles.dotSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onSelect(today);
            onClose();
          }}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Today</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onSelect(null);
            onClose();
          }}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>Show all dates</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = themedStyleSheet({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  monthLabel: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  grid: { gap: 2, marginTop: -6 },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2, minHeight: 48 },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: 1.5, borderColor: colors.accent },
  selected: { backgroundColor: colors.accent, borderWidth: 0 },
  dayText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  futureText: { color: '#c3cad8' },
  selectedText: { color: '#ffffff', fontWeight: '800' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  dotOn: { backgroundColor: colors.accent },
  dotSelected: { backgroundColor: '#9dbcf2' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#edf2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  primary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
