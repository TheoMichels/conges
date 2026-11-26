import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LeaveEntry, LeaveEntryDraft, MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts, shape, tagPalette } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { entryOrderKey, entryTotalDays, formatDateFr } from "../utils/leaveDays";
import { formatDays } from "../utils/format";
import { ActionIcon } from "./ActionIcon";
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
      <View style={styles.sectionHeader}>
      <Text style={styles.title}>Congés saisis</Text>
      {!isAdding && <Pressable
        testID="add-leave-button"
        accessibilityRole="button"
        style={[styles.addButton, cursorPointer]}
        onPress={() => setIsAdding(true)}
      ><Text style={styles.addButtonText}>+ Ajouter un congé</Text></Pressable>}
      </View>

      {isAdding ? (
        <LeaveEntryForm
          year={year}
          onSubmit={(draft) => {
            onAdd(draft);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      ) : null}

      {sorted.length === 0 ? (
        <Text style={styles.empty}>Aucun congé saisi pour {year}.</Text>
      ) : (
        sorted.map((entry, index) =>
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
            <View key={entry.id} style={[styles.entry, isMobile && styles.entryMobile]}>
              <View style={[styles.entryMain, isMobile && styles.entryMainMobile]}>
                <Text style={styles.entryLabel} numberOfLines={1}>
                  {entry.label}
                </Text>
                <Text style={styles.entryDetail}>{describe(entry)}</Text>
              </View>
              <Text
                style={[
                  styles.entryDays,
                  {
                    backgroundColor: tagPalette[index % tagPalette.length].background,
                    color: tagPalette[index % tagPalette.length].text,
                  },
                ]}
              >
                {formatDays(entryTotalDays(entry))}
              </Text>
              <View style={styles.entryActions}>
              <Pressable
                testID={`edit-leave-${entry.id}`}
                accessibilityLabel="Modifier le congé"
                accessibilityRole="button"
                style={({ pressed }) => [styles.iconButton, cursorPointer, pressed && styles.iconButtonPressed]}
                onPress={() => setEditingId(entry.id)}
                hitSlop={8}
              >
                <ActionIcon name="edit" />
              </Pressable>
              <Pressable
                testID={`delete-leave-${entry.id}`}
                accessibilityLabel="Supprimer le congé"
                accessibilityRole="button"
                style={({ pressed }) => [styles.iconButton, cursorPointer, pressed && styles.iconButtonPressed]}
                onPress={() => onRemove(entry.id)}
                hitSlop={8}
              >
                <ActionIcon name="delete" />
              </Pressable>
              </View>
            </View>
          )
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: shape.card,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  cardMobile: {
    padding: 12,
    marginBottom: 20,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  title: {
    fontFamily: fonts.base,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 0,
  },
  addButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.cta,
    marginBottom: 0,
  },
  addButtonText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textOnBrand,
  },
  empty: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderDashed,
    borderRadius: shape.row,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  entryMobile: { flexWrap: "nowrap", gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  entryMainMobile: { minWidth: 0 },
  entryMain: {
    flex: 1,
    minWidth: 150,
  },
  entryLabel: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  entryDetail: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textSecondary,
  },
  entryDays: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shape.pill,
    overflow: "hidden",
  },
  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: -7,
    marginRight: -7,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
});
