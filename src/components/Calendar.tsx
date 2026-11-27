import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDateFr, parseISODate, toISODate } from "../utils/leaveDays";
import { publicHolidayMap } from "../utils/leaveStats";
import { Icon } from "./ui/Icon";

type Props = {
  startDate: string;
  endDate: string;
  onSelectRange: (startDate: string, endDate: string) => void;
  // Jours déjà posés (autres congés), soulignés dans la grille.
  takenDates?: Set<string>;
  cellSize?: number;
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

export function Calendar({ startDate, endDate, onSelectRange, takenDates, cellSize = CELL_SIZE }: Props) {
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
  const holidays = publicHolidayMap(year);
  const cellStyle = { width: cellSize, height: cellSize };

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
    <View style={[styles.container, { width: cellSize * 7 }]}>
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

        <Icon name="arrow" size={14} color={colors.textFaint} />

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
        <Pressable style={[styles.nav, cursorPointer]} accessibilityRole="button" accessibilityLabel="Mois précédent" onPress={() => goToMonth(-1)} hitSlop={4}>
          <Icon name="left" size={18} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_LABELS[month]} {year}
        </Text>
        <Pressable style={[styles.nav, cursorPointer]} accessibilityRole="button" accessibilityLabel="Mois suivant" onPress={() => goToMonth(1)} hitSlop={4}>
          <Icon name="right" size={18} />
        </Pressable>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.weekdayLabel, { width: cellSize }]}>
            {label}
          </Text>
        ))}
      </View>

      {/* Calendar Grid with Connecting Path */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={[styles.cell, cellStyle]} />;

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
          const holidayName = holidays.get(cellIso);
          const isTaken = !!takenDates?.has(cellIso) && !isInRange;

          return (
            <Pressable
              key={i}
              testID={`calendar-day-${cellIso}`}
              accessibilityRole="button"
              accessibilityLabel={holidayName ? `${formatDateFr(cellIso)} — ${holidayName}` : formatDateFr(cellIso)}
              style={[styles.cell, cellStyle, cursorPointer]}
              onPress={() => handleDateClick(cellIso)}
            >
              {/* Connected track bar (le chemin) */}
              {isInRange && !isSingleDay && (
                <View
                  style={[
                    styles.rangeTrack,
                    isStart && { left: cellSize / 2, borderTopLeftRadius: cellSize / 2, borderBottomLeftRadius: cellSize / 2 },
                    isEnd && { right: cellSize / 2, borderTopRightRadius: cellSize / 2, borderBottomRightRadius: cellSize / 2 },
                    isRowStart && !isStart && styles.rangeTrackRowStart,
                    isRowEnd && !isEnd && styles.rangeTrackRowEnd,
                  ]}
                />
              )}

              {/* Day Badge */}
              <View
                style={[
                  styles.dayBadge,
                  { width: cellSize - 6, height: cellSize - 6, borderRadius: (cellSize - 6) / 2 },
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
              {isTaken && <View style={styles.takenMark} />}
              {holidayName && !isStart && !isEnd && <View style={styles.holidayDot} />}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={styles.legendSelected} /><Text style={styles.legendText}>Sélection</Text></View>
        {takenDates && takenDates.size > 0 ? <View style={styles.legendItem}><View style={styles.legendTaken} /><Text style={styles.legendText}>Déjà posé</Text></View> : null}
        <View style={styles.legendItem}><View style={styles.legendHoliday} /><Text style={styles.legendText}>Férié</Text></View>
      </View>
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {},
  rangeBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 12 },
  rangeChip: { flex: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  rangeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rangeChipPrefix: { fontFamily: fonts.base, fontSize: 10.5, fontWeight: "700", letterSpacing: 0.5, color: colors.textSecondary, textTransform: "uppercase" },
  rangeChipDate: { fontFamily: fonts.base, fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  nav: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  monthLabel: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  weekdayRow: { flexDirection: "row", marginBottom: 4 },
  weekdayLabel: { fontFamily: fonts.base, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.textFaint },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { alignItems: "center", justifyContent: "center", marginBottom: 2, position: "relative" },
  rangeTrack: { position: "absolute", top: 3, bottom: 3, left: 0, right: 0, backgroundColor: colors.primarySoft },
  rangeTrackRowStart: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  rangeTrackRowEnd: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  dayBadge: { alignItems: "center", justifyContent: "center", zIndex: 1 },
  dayBadgeSelected: { backgroundColor: colors.primary },
  dayBadgeToday: { borderWidth: 1.5, borderColor: colors.cta },
  dayText: { fontFamily: fonts.base, fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  dayTextWeekend: { color: colors.textFaint, fontWeight: "500" },
  dayTextInRange: { color: colors.primary, fontWeight: "700" },
  dayTextSelected: { color: colors.textOnBrand, fontWeight: "700" },
  takenMark: { position: "absolute", bottom: 5, width: 14, height: 2, borderRadius: 2, backgroundColor: colors.primaryLight, zIndex: 2 },
  holidayDot: { position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.cta, zIndex: 2 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontFamily: fonts.base, fontSize: 12, color: colors.textSecondary },
  legendSelected: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  legendTaken: { width: 12, height: 2, borderRadius: 2, backgroundColor: colors.primaryLight },
  legendHoliday: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.cta },
});
