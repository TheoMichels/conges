import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionIcon } from "./ActionIcon";
import { YearPlan } from "../types/yearPlan";
import { colors, fonts, selectedInset, shape } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import {
  calculatePlanRemaining,
  parseYearNumber,
  sortPlansChronologically,
} from "../utils/yearPlanUtils";
import { formatDayNumber } from "../utils/format";

type Props = {
  readOnly?: boolean;
  plans: YearPlan[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onAdd: (year: string) => void;
  onRename: (id: string, year: string) => void;
  onDelete: (id: string) => void;
};

function suggestNextYear(plans: YearPlan[]): string {
  const years = plans
    .map((p) => parseYearNumber(p.year))
    .filter((n): n is number => n !== null);
  const base = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  return String(base + 1);
}

export function Sidebar({
  readOnly = false,
  plans,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentCalendarYear = new Date().getFullYear();
  const sortedPlans = sortPlansChronologically(plans);

  const startAdding = () => {
    setDraft(suggestNextYear(plans));
    setIsAdding(true);
  };

  const commitAdd = () => {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft("");
    setIsAdding(false);
  };

  const startEditing = (plan: YearPlan) => {
    setEditingId(plan.id);
    setEditDraft(plan.year);
  };

  const commitEdit = () => {
    const trimmed = editDraft.trim();
    if (editingId && trimmed) onRename(editingId, trimmed);
    setEditingId(null);
  };

  return (
    <View testID="year-sidebar" style={styles.sidebar}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>Années</Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {sortedPlans.map((plan) => {
          const selected = plan.id === selectedId;
          const planYearNum = parseYearNumber(plan.year);
          const isCurrentYear = planYearNum === currentCalendarYear;
          const remaining = calculatePlanRemaining(plan);

          if (editingId === plan.id) {
            return (
              <TextInput
                key={plan.id}
                testID="section-name-input"
                accessibilityLabel="Nom de la section"
                style={styles.editInput}
                value={editDraft}
                onChangeText={setEditDraft}
                keyboardType="number-pad"
                maxLength={4}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
              />
            );
          }

          if (confirmDeleteId === plan.id) {
            return (
              <View key={plan.id} style={[styles.item, styles.confirmItem]}>
                <Text style={styles.confirmText} numberOfLines={1}>
                  Supprimer {plan.year} ?
                </Text>
                <Pressable
                  style={cursorPointer}
                  onPress={() => {
                    onDelete(plan.id);
                    setConfirmDeleteId(null);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.confirmYes}>✓</Text>
                </Pressable>
                <Pressable
                  style={cursorPointer}
                  accessibilityRole="button"
                  accessibilityLabel="Annuler la suppression"
                  onPress={() => setConfirmDeleteId(null)}
                  hitSlop={8}
                >
                  <Text style={styles.confirmNo}>✕</Text>
                </Pressable>
              </View>
            );
          }

          return (
            <View
              key={plan.id}
              style={[styles.item, selected && styles.itemSelected, selected && selectedInset]}
            >
              <Pressable
                style={[styles.itemPressable, cursorPointer]}
                onPress={() => onSelect(plan.id)}
              >
                <View style={styles.itemContent}>
                  <View style={styles.yearRow}>
                    <Text
                      style={[styles.itemText, selected && styles.itemTextSelected]}
                      numberOfLines={1}
                    >
                      {plan.year}
                    </Text>
                    {isCurrentYear && (
                      <View
                        style={[
                          styles.currentBadge,
                          selected && styles.currentBadgeSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.currentBadgeText,
                            selected && styles.currentBadgeTextSelected,
                          ]}
                        >
                          En cours
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>

              {selected && !readOnly ? (
                <View style={styles.actionButtons}>
                  <Pressable
                    testID={`edit-section-${plan.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Modifier la section ${plan.year}`}
                    style={({ pressed }) => [styles.iconButton, cursorPointer, pressed && styles.iconButtonPressed]}
                    onPress={(e) => {
                      e.stopPropagation();
                      startEditing(plan);
                    }}
                    hitSlop={8}
                  >
                    <ActionIcon name="edit" />
                  </Pressable>
                  <Pressable
                    testID={`delete-section-${plan.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer la section ${plan.year}`}
                    style={({ pressed }) => [styles.iconButton, cursorPointer, pressed && styles.iconButtonPressed]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(plan.id);
                    }}
                    hitSlop={8}
                  >
                    <ActionIcon name="delete" />
                  </Pressable>
                </View>
              ) : (
                <View
                  style={[
                    styles.remainingBadge,
                    remaining < 0
                      ? styles.remainingBadgeNegative
                      : styles.remainingBadgePositive,
                    selected && styles.remainingBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.remainingBadgeText,
                      remaining < 0
                        ? styles.remainingBadgeTextNegative
                        : styles.remainingBadgeTextPositive,
                      selected && styles.remainingBadgeTextSelected,
                    ]}
                  >
                    {remaining > 0
                      ? `+${formatDayNumber(remaining)} j`
                      : `${formatDayNumber(remaining)} j`}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!readOnly && (isAdding ? (
        <TextInput
          style={styles.addInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="AAAA"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={4}
          onSubmitEditing={commitAdd}
          onBlur={commitAdd}
          autoFocus
        />
      ) : (
        <Pressable
          style={[styles.addButton, cursorPointer]}
          onPress={startAdding}
        >
          <Text style={styles.addButtonText}>+ Ajouter une année</Text>
        </Pressable>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    width: 240,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    marginRight: 28,
  },
  headerRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  brand: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    marginBottom: 10,
  },
  itemSelected: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  itemPressable: {
    flex: 1,
    minWidth: 0,
  },
  itemContent: {
    flexDirection: "column",
    justifyContent: "center",
  },
  yearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  itemText: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  itemTextSelected: {
    color: colors.textPrimary,
  },
  currentBadge: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: shape.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeSelected: {
    backgroundColor: colors.panel,
  },
  currentBadgeText: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  currentBadgeTextSelected: {
    color: colors.primary,
  },
  remainingBadge: {
    borderRadius: shape.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  remainingBadgePositive: {
    backgroundColor: colors.positiveSoft,
  },
  remainingBadgeNegative: {
    backgroundColor: colors.dangerSoft,
  },
  remainingBadgeSelected: {},
  remainingBadgeText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "700",
  },
  remainingBadgeTextPositive: {
    color: colors.positive,
  },
  remainingBadgeTextNegative: {
    color: colors.danger,
  },
  remainingBadgeTextSelected: {},
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginVertical: -7,
    marginRight: -7,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  confirmItem: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#F5C2C2",
  },
  confirmText: {
    fontFamily: fonts.base,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  confirmYes: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: "700",
    color: colors.danger,
    paddingHorizontal: 4,
  },
  confirmNo: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
  addButton: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.borderDashed,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textSecondary,
  },
  addInput: {
    fontFamily: fonts.base,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.panel,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  editInput: {
    fontFamily: fonts.base,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.panel,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
});
