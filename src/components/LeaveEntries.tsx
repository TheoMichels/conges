import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LeaveEntry, LeaveEntryDraft, MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts, glassStyle, radius, shadows } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { entryOrderKey, entryTotalDays, formatDateFr } from "../utils/leaveDays";
import { formatDays } from "../utils/format";
import { LeaveEntryForm } from "./LeaveEntryForm";

type Props = {
  year: string;
  entries: LeaveEntry[];
  onAdd: (draft: LeaveEntryDraft) => void;
  onUpdate: (entryId: string, draft: LeaveEntryDraft) => void;
  onRemove: (entryId: string) => void;
};

function describe(entry: LeaveEntry): string {
  if (entry.kind === "month") return MONTH_LABELS[entry.month];
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

  const startStr = `${formatDateFr(entry.startDate)}${
    entry.startHalf === "afternoon" ? " (après-midi)" : ""
  }`;
  const endStr = `${formatDateFr(entry.endDate)}${
    entry.endHalf === "morning" ? " (matin)" : ""
  }`;
  return `${startStr} → ${endStr}`;
}

export function LeaveEntries({ year, entries, onAdd, onUpdate, onRemove }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) => entryOrderKey(a) - entryOrderKey(b));

  return (
    <View style={[styles.card, isMobile && styles.cardMobile]}>
      <Text style={styles.title}>Congés saisis</Text>

      {isAdding ? (
        <LeaveEntryForm
          year={year}
          onSubmit={(draft) => {
            onAdd(draft);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Pressable
          testID="add-leave-button"
          accessibilityRole="button"
          style={[styles.addButton, cursorPointer]}
          onPress={() => setIsAdding(true)}
        >
          <Text style={styles.addButtonText}>+ Ajouter un congé</Text>
        </Pressable>
      )}

      {sorted.length === 0 ? (
        <Text style={styles.empty}>Aucun congé saisi pour {year}.</Text>
      ) : (
        sorted.map((entry) =>
          editingId === entry.id ? (
            <LeaveEntryForm
              key={entry.id}
              year={year}
              initial={entry}
              submitLabel="Enregistrer"
              onSubmit={(draft) => {
                onUpdate(entry.id, draft);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <View key={entry.id} style={styles.entry}>
              <View style={styles.entryMain}>
                <Text style={styles.entryLabel} numberOfLines={1}>
                  {entry.label}
                </Text>
                <Text style={styles.entryDetail}>{describe(entry)}</Text>
              </View>
              <Text style={styles.entryDays}>{formatDays(entryTotalDays(entry))}</Text>
              <Pressable
                accessibilityLabel="Modifier le congé"
                accessibilityRole="button"
                style={[styles.iconButton, cursorPointer]}
                onPress={() => setEditingId(entry.id)}
                hitSlop={8}
              >
                <Text style={styles.entryEdit}>✎</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Supprimer le congé"
                accessibilityRole="button"
                style={[styles.iconButton, cursorPointer]}
                onPress={() => onRemove(entry.id)}
                hitSlop={8}
              >
                <Text style={styles.entryDelete}>🗑</Text>
              </Pressable>
            </View>
          )
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    ...glassStyle,
    ...shadows.sm,
  },
  cardMobile: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 20,
    ...glassStyle,
    ...shadows.sm,
  },
  title: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 16,
  },
  addButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  addButtonText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textOnBrand,
  },
  empty: {
    fontFamily: fonts.base,
    color: colors.textMuted,
    marginTop: 8,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 44,
  },
  entryMain: {
    flex: 1,
    minWidth: 150,
  },
  entryLabel: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  entryDetail: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.textMuted,
  },
  entryDays: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  entryEdit: {
    fontFamily: fonts.base,
    fontSize: 15,
    color: colors.textMuted,
  },
  entryDelete: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textMuted,
  },
});
