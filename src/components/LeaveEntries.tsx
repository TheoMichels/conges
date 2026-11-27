import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LeaveEntry, LeaveEntryDraft, MONTH_LABELS, SHORT_MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts, tabular } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { entryOrderKey, entryTotalDays, formatDateFr, parseISODate, toISODate } from "../utils/leaveDays";
import { formatDayNumber } from "../utils/format";
import { isUpcomingEntry } from "../utils/leaveStats";
import { ActionIcon } from "./ActionIcon";
import { LeaveEntryForm } from "./LeaveEntryForm";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";

type Props = {
  year: string;
  entries: LeaveEntry[];
  remaining?: number;
  isAdding: boolean;
  onCloseAdd: () => void;
  onAdd: (draft: LeaveEntryDraft) => void;
  onUpdate: (entryId: string, draft: LeaveEntryDraft) => void;
  onRemove: (entryId: string) => void;
};

function describe(entry: LeaveEntry): string {
  if (entry.kind === "month") return `${MONTH_LABELS[entry.month]} · À dater`;
  if (entry.startDate === entry.endDate) {
    const formatted = formatDateFr(entry.startDate);
    if (entry.startHalf === "morning" && entry.endHalf === "morning") {
      return `${formatted} (matin)`;
    }
    if (entry.startHalf === "afternoon" && entry.endHalf === "afternoon") {
      return `${formatted} (après-midi)`;
    }
    return formatted;
  }
  const startStr = `${formatDateFr(entry.startDate)}${entry.startHalf === "afternoon" ? " (après-midi)" : ""}`;
  const endStr = `${formatDateFr(entry.endDate)}${entry.endHalf === "morning" ? " (matin)" : ""}`;
  return `${startStr} → ${endStr}`;
}

// Jours déjà posés par les autres congés datés (soulignés dans le calendrier de saisie).
function takenDatesOf(entries: LeaveEntry[], exceptId?: string): Set<string> {
  const dates = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "dates" || entry.id === exceptId) continue;
    const cursor = parseISODate(entry.startDate);
    const end = parseISODate(entry.endDate);
    if (!cursor || !end) continue;
    while (cursor <= end) { dates.add(toISODate(cursor)); cursor.setDate(cursor.getDate() + 1); }
  }
  return dates;
}

function daysUntil(entry: LeaveEntry): number | null {
  if (entry.kind !== "dates") return null;
  const start = parseISODate(entry.startDate);
  if (!start) return null;
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((start.getTime() - base.getTime()) / 86_400_000);
}

export function LeaveEntries({ year, entries, remaining, isAdding, onCloseAdd, onAdd, onUpdate, onRemove }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [editingId, setEditingId] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) => entryOrderKey(a) - entryOrderKey(b));
  const upcoming = sorted.filter((entry) => isUpcomingEntry(entry, year));
  const past = sorted.filter((entry) => !isUpcomingEntry(entry, year)).reverse();
  const totalDays = Math.round(entries.reduce((sum, entry) => sum + entryTotalDays(entry), 0) * 100) / 100;

  const renderEntry = (entry: LeaveEntry, isPast: boolean) => {
    if (editingId === entry.id) {
      return (
        <LeaveEntryForm
          key={entry.id}
          year={year}
          initial={entry}
          submitLabel="Enregistrer"
          remaining={remaining}
          initialDays={entryTotalDays(entry)}
          takenDates={takenDatesOf(entries, entry.id)}
          onSubmit={(draft) => { onUpdate(entry.id, draft); setEditingId(null); }}
          onCancel={() => setEditingId(null)}
        />
      );
    }
    const start = entry.kind === "dates" ? parseISODate(entry.startDate) : null;
    const monthIndex = start ? start.getMonth() : entry.kind === "month" ? entry.month : 0;
    const until = isPast ? null : daysUntil(entry);
    const days = entryTotalDays(entry);
    return (
      <View key={entry.id} style={[styles.entry, isMobile && styles.entryMobile]}>
        <View style={styles.datebox}>
          <Text style={[styles.dateMonth, isPast && styles.dateMonthPast]}>{SHORT_MONTH_LABELS[monthIndex]}</Text>
          {start ? <Text style={styles.dateDay}>{start.getDate()}</Text> : <Icon name="calendar" size={16} color={colors.textSecondary} />}
        </View>
        <View style={styles.entryMain}>
          <Text style={styles.entryLabel} numberOfLines={1}>{entry.label}</Text>
          <Text style={styles.entryDetail}>{describe(entry)}</Text>
          {until !== null && until > 0 && until <= 60 && !isMobile ? (
            <Badge tone="cta" label={until === 1 ? "demain" : `dans ${until} jours`} style={styles.untilBadge} />
          ) : null}
        </View>
        <View style={styles.duration}>
          <Text style={styles.durationValue}>{formatDayNumber(days)}</Text>
          <Text style={styles.durationUnit}>j</Text>
        </View>
        <View style={styles.entryActions}>
          <Pressable
            testID={`edit-leave-${entry.id}`}
            accessibilityLabel="Modifier le congé"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, cursorPointer, pressed && styles.iconButtonPressed]}
            onPress={() => setEditingId(entry.id)}
            hitSlop={4}
          >
            <ActionIcon name="edit" />
          </Pressable>
          <Pressable
            testID={`delete-leave-${entry.id}`}
            accessibilityLabel="Supprimer le congé"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, cursorPointer, pressed && styles.iconButtonPressed]}
            onPress={() => onRemove(entry.id)}
            hitSlop={4}
          >
            <ActionIcon name="delete" />
          </Pressable>
        </View>
      </View>
    );
  };

  const group = (title: string, list: LeaveEntry[], isPast: boolean) =>
    list.length === 0 ? null : (
      <View style={styles.group}>
        <View style={styles.groupTitle}>
          <Text style={styles.groupTitleText}>{title}</Text>
          <Text style={styles.groupCount}>· {list.length}</Text>
        </View>
        {list.map((entry, index) => (
          <View key={entry.id} style={index > 0 && styles.separator}>{renderEntry(entry, isPast)}</View>
        ))}
      </View>
    );

  return (
    <Card style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Congés saisis</Text>
        <View style={styles.count}><Text style={styles.countText}>{entries.length}</Text></View>
        <View style={styles.spacer} />
        {entries.length > 0 && !isMobile ? <Text style={styles.total}>{formatDayNumber(totalDays)} jours ouvrés au total</Text> : null}
      </View>

      {isAdding ? (
        <LeaveEntryForm
          year={year}
          remaining={remaining}
          takenDates={takenDatesOf(entries)}
          onSubmit={(draft) => { onAdd(draft); onCloseAdd(); }}
          onCancel={onCloseAdd}
        />
      ) : null}

      {sorted.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="calendar" size={22} color={colors.textFaint} />
          <Text style={styles.empty}>Aucun congé saisi pour {year}.</Text>
        </View>
      ) : (
        <View style={styles.groups}>
          {group("À venir", upcoming, false)}
          {group("Passés", past, true)}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  title: { fontFamily: fonts.base, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  count: { backgroundColor: colors.divider, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  countText: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  spacer: { flex: 1 },
  total: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
  groups: { paddingHorizontal: 12, paddingBottom: 6 },
  group: { marginTop: 4 },
  groupTitle: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 6 },
  groupTitleText: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textSecondary },
  groupCount: { fontFamily: fonts.base, fontSize: 12, color: colors.textFaint },
  separator: { borderTopWidth: 1, borderTopColor: colors.divider },
  entry: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 8, paddingVertical: 10 },
  entryMobile: { gap: 10, paddingHorizontal: 4 },
  datebox: { width: 48, height: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, alignItems: "center", justifyContent: "center" },
  dateMonth: { fontFamily: fonts.base, fontSize: 10.5, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: colors.ctaText },
  dateMonthPast: { color: colors.textSecondary },
  dateDay: { fontFamily: fonts.base, fontSize: 19, fontWeight: "700", color: colors.textPrimary, lineHeight: 22, ...tabular },
  entryMain: { flex: 1, minWidth: 0 },
  entryLabel: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  entryDetail: { fontFamily: fonts.base, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  untilBadge: { marginTop: 6, alignSelf: "flex-start" },
  duration: { flexDirection: "row", alignItems: "baseline", gap: 3, minWidth: 48, justifyContent: "flex-end" },
  durationValue: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "700", color: colors.textPrimary, ...tabular },
  durationUnit: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  entryActions: { flexDirection: "row", alignItems: "center", marginRight: -6 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  iconButtonPressed: { opacity: 0.6 },
  emptyBox: { alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 6, marginBottom: 12, paddingVertical: 24, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderDashed, borderRadius: 12 },
  empty: { fontFamily: fonts.base, fontSize: 14, color: colors.textSecondary },
});
