import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDateFr, parseISODate, toISODate } from "../utils/leaveDays";

type Props = {
  startDate: string;
  endDate: string;
  onSelectRange: (startDate: string, endDate: string) => void;
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Monday-first offset: JS getDay() is 0 (Sunday) - 6 (Saturday).
function mondayFirstOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function Calendar({ startDate, endDate, onSelectRange }: Props) {
  const parsedStart = parseISODate(startDate);
  const [viewDate, setViewDate] = useState(() => parsedStart ?? new Date());

  // Mode: next click chooses "start" or "end".
  // "auto": if range is complete, first click sets start; second click sets end.
  const [pickingTarget, setPickingTarget] = useState<"start" | "end" | "auto">("auto");

  useEffect(() => {
    const date = parseISODate(startDate);
    if (!date) return;
    setViewDate((current) =>
      current.getFullYear() === date.getFullYear() && current.getMonth() === date.getMonth()
        ? current
        : new Date(date.getFullYear(), date.getMonth(), 1)
    );
  }, [startDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = mondayFirstOffset(new Date(year, month, 1));
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goToMonth = (delta: number) =>
    setViewDate(new Date(year, month + delta, 1));

  const handleDateClick = (clickedIso: string) => {
    if (pickingTarget === "start") {
      if (clickedIso > endDate) {
        onSelectRange(clickedIso, clickedIso);
      } else {
        onSelectRange(clickedIso, endDate);
      }
      setPickingTarget("auto");
      return;
    }

    if (pickingTarget === "end") {
      if (clickedIso < startDate) {
        onSelectRange(clickedIso, clickedIso);
      } else {
        onSelectRange(startDate, clickedIso);
      }
      setPickingTarget("auto");
      return;
    }

    // "auto" mode: 2-click range selection
    // If range is already selected or single day, click starts a new range
    if (startDate === endDate) {
      if (clickedIso < startDate) {
        onSelectRange(clickedIso, startDate);
      } else {
        onSelectRange(startDate, clickedIso);
      }
    } else {
      // Range already had start < end, clicking a date starts a fresh range from this date
      onSelectRange(clickedIso, clickedIso);
    }
  };

  return (
    <View style={styles.container}>
      {/* Range Status Bar */}
      <View style={styles.rangeBar}>
        <Pressable
          style={[
            styles.rangeChip,
            pickingTarget === "start" && styles.rangeChipActive,
            cursorPointer,
          ]}
          onPress={() => setPickingTarget("start")}
        >
          <Text style={styles.rangeChipPrefix}>Du</Text>
          <Text style={styles.rangeChipDate}>{formatDateFr(startDate)}</Text>
        </Pressable>

        <Text style={styles.rangeSeparator}>→</Text>

        <Pressable
          style={[
            styles.rangeChip,
            pickingTarget === "end" && styles.rangeChipActive,
            cursorPointer,
          ]}
          onPress={() => setPickingTarget("end")}
        >
          <Text style={styles.rangeChipPrefix}>Au</Text>
          <Text style={styles.rangeChipDate}>{formatDateFr(endDate)}</Text>
        </Pressable>
      </View>

      {/* Month Navigation */}
      <View style={styles.header}>
        <Pressable style={cursorPointer} onPress={() => goToMonth(-1)} hitSlop={8}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_LABELS[month]} {year}
        </Text>
        <Pressable style={cursorPointer} onPress={() => goToMonth(1)} hitSlop={8}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Calendar Grid with Connecting Path */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;

          const cellDate = new Date(year, month, day);
          const cellIso = toISODate(cellDate);
          const isToday = isSameDay(cellDate, today);
          const weekday = cellDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
          const isWeekend = weekday === 0 || weekday === 6;
          const isRowStart = weekday === 1; // Monday
          const isRowEnd = weekday === 0; // Sunday

          const isStart = cellIso === startDate;
          const isEnd = cellIso === endDate;
          const isInRange = cellIso >= startDate && cellIso <= endDate;
          const isSingleDay = startDate === endDate;

          return (
            <Pressable
              key={i}
              style={[styles.cell, cursorPointer]}
              onPress={() => handleDateClick(cellIso)}
            >
              {/* Connected track bar (le chemin) */}
              {isInRange && !isSingleDay && (
                <View
                  style={[
                    styles.rangeTrack,
                    isStart && styles.rangeTrackStart,
                    isEnd && styles.rangeTrackEnd,
                    isRowStart && !isStart && styles.rangeTrackRowStart,
                    isRowEnd && !isEnd && styles.rangeTrackRowEnd,
                  ]}
                />
              )}

              {/* Day Badge */}
              <View
                style={[
                  styles.dayBadge,
                  (isStart || isEnd) && styles.dayBadgeSelected,
                  !isStart && !isEnd && isToday && styles.dayBadgeToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isWeekend && styles.dayTextWeekend,
                    isInRange && !isStart && !isEnd && styles.dayTextInRange,
                    (isStart || isEnd) && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE * 7,
  },
  rangeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F4F7",
    borderRadius: 8,
    padding: 6,
    marginBottom: 12,
  },
  rangeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipActive: {
    borderColor: colors.brand,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  rangeChipPrefix: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  rangeChipDate: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  rangeSeparator: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  nav: {
    fontFamily: fonts.base,
    fontSize: 20,
    color: colors.textSecondary,
    paddingHorizontal: 8,
  },
  monthLabel: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    fontFamily: fonts.base,
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
    position: "relative",
  },
  rangeTrack: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    right: 0,
    backgroundColor: "#DCEBF2",
  },
  rangeTrackStart: {
    left: CELL_SIZE / 2,
    borderTopLeftRadius: CELL_SIZE / 2,
    borderBottomLeftRadius: CELL_SIZE / 2,
  },
  rangeTrackEnd: {
    right: CELL_SIZE / 2,
    borderTopRightRadius: CELL_SIZE / 2,
    borderBottomRightRadius: CELL_SIZE / 2,
  },
  rangeTrackRowStart: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rangeTrackRowEnd: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  dayBadge: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    borderRadius: (CELL_SIZE - 6) / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dayBadgeSelected: {
    backgroundColor: colors.brand,
  },
  dayBadgeToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dayText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  dayTextWeekend: {
    color: "#B4C0C8",
  },
  dayTextInRange: {
    color: colors.brand,
    fontWeight: "700",
  },
  dayTextSelected: {
    color: colors.textOnBrand,
    fontWeight: "700",
  },
});
