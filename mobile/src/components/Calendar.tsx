import { View, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { colors, spacing, radii } from '../theme/tokens';

type Props = {
  selectedMonth: Date;
  onChangeMonth: (d: Date) => void;
  workoutDates: Set<string>; // 'YYYY-MM-DD' strings of dates with workouts
  onDayPress: (date: string) => void; // 'YYYY-MM-DD'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Calendar({ selectedMonth, onChangeMonth, workoutDates, onDayPress }: Props) {
  const today = new Date();
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();

  // First day of month, weekday (0=Sun..6=Sat)
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();

  // Build a 6x7 grid (42 cells), starting from the Sunday on/before firstOfMonth
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }

  const goPrev = () => onChangeMonth(new Date(year, month - 1, 1));
  const goNext = () => onChangeMonth(new Date(year, month + 1, 1));

  return (
    <View>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityLabel="Previous month"
          onPress={goPrev}
          style={styles.navBtn}
        >
          <Icon icon={ChevronLeft} size={22} color={colors.textPrimary} />
        </Pressable>
        <Text variant="title3" color="textPrimary" style={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          accessibilityLabel="Next month"
          onPress={goNext}
          style={styles.navBtn}
        >
          <Icon icon={ChevronRight} size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Day-of-week row */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <View key={i} style={styles.weekCell}>
            <Text variant="overline" color="textTertiary">{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === month;
          const iso = toISODate(date);
          const hasWorkout = workoutDates.has(iso);
          const isToday = isSameDay(date, today);
          const labelColor = inMonth ? 'textPrimary' : 'textDisabled';

          const cellInner = (
            <View
              style={[
                styles.dayInner,
                isToday && styles.todayBorder,
              ]}
            >
              <Text variant="body" color={labelColor}>
                {date.getDate()}
              </Text>
              <View style={styles.dotSlot}>
                {hasWorkout && <View style={styles.dot} />}
              </View>
            </View>
          );

          if (hasWorkout) {
            return (
              <Pressable
                key={i}
                accessibilityLabel={`View workouts on ${iso}`}
                onPress={() => onDayPress(iso)}
                style={styles.dayCell}
                hapticType="light"
              >
                {cellInner}
              </Pressable>
            );
          }

          return (
            <View key={i} style={styles.dayCell}>
              {cellInner}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  todayBorder: {
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  dotSlot: {
    height: 6,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
  },
});
