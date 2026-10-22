import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { YearPlan } from "../types/yearPlan";
import { colors, fonts, radius } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import {
  calculatePlanRemaining,
  parseYearNumber,
  sortPlansChronologically,
} from "../utils/yearPlanUtils";
import { formatDayNumber } from "../utils/format";

type Props = {
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = () => {
    const jsonString = JSON.stringify(plans, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(jsonString).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    } else if (typeof window !== "undefined") {
      window.prompt("Copiez votre JSON :", jsonString);
    }
  };

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
    <View style={styles.sidebar}>
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
                  onPress={() => setConfirmDeleteId(null)}
                  hitSlop={8}
                >
                  <Text style={styles.confirmNo}>✕</Text>
                </Pressable>
              </View>
            );
          }

          const hoverProps = {
            onMouseEnter: () => setHoveredId(plan.id),
            onMouseLeave: () =>
              setHoveredId((current) => (current === plan.id ? null : current)),
          };

          return (
            <View
              key={plan.id}
              style={[styles.item, selected && styles.itemSelected]}
              {...hoverProps}
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

              {hoveredId === plan.id ? (
                <View style={styles.actionButtons}>
                  <Pressable
                    style={cursorPointer}
                    onPress={(e) => {
                      e.stopPropagation();
                      startEditing(plan);
                    }}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.editIcon,
                        selected && styles.editIconSelected,
                      ]}
                    >
                      ✎
                    </Text>
                  </Pressable>
                  <Pressable
                    style={cursorPointer}
                    onPress={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(plan.id);
                    }}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.deleteIcon,
                        selected && styles.deleteIconSelected,
                      ]}
                    >
                      🗑
                    </Text>
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

      {isAdding ? (
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
      )}

      <Pressable
        style={[styles.exportButton, cursorPointer]}
        onPress={handleExport}
      >
        <Text
          style={[
            styles.exportButtonText,
            copied && styles.exportButtonTextCopied,
          ]}
        >
          {copied ? "✓ JSON copié dans le presse-papier !" : "📋 Exporter le JSON"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    width: 220,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 16,
    marginRight: 20,
  },
  headerRow: {
    marginBottom: 14,
  },
  brand: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  list: {
    flexGrow: 1,
    marginBottom: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 44,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  itemSelected: {
    backgroundColor: colors.selection,
  },
  itemPressable: {
    flex: 1,
  },
  itemContent: {
    flexDirection: "column",
    justifyContent: "center",
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemText: {
    fontFamily: fonts.base,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  itemTextSelected: {
    color: colors.textPrimary,
  },
  currentBadge: {
    backgroundColor: colors.panelSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  currentBadgeSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  currentBadgeText: {
    fontFamily: fonts.base,
    fontSize: 9,
    fontWeight: "500",
    color: colors.brandMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  currentBadgeTextSelected: {
    color: colors.textPrimary,
  },
  remainingBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  remainingBadgePositive: {
    backgroundColor: colors.positiveSoft,
  },
  remainingBadgeNegative: {
    backgroundColor: colors.dangerSoft,
  },
  remainingBadgeSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  remainingBadgeText: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "500",
  },
  remainingBadgeTextPositive: {
    color: colors.positive,
  },
  remainingBadgeTextNegative: {
    color: colors.danger,
  },
  remainingBadgeTextSelected: {
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editIcon: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.textMuted,
  },
  editIconSelected: {
    color: colors.textPrimary,
  },
  deleteIcon: {
    fontFamily: fonts.base,
    fontSize: 12,
    color: colors.textMuted,
  },
  deleteIconSelected: {
    color: colors.textPrimary,
  },
  confirmItem: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  confirmText: {
    fontFamily: fonts.base,
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: colors.danger,
  },
  confirmYes: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "500",
    color: colors.danger,
    paddingHorizontal: 4,
  },
  confirmNo: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonText: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  addInput: {
    fontFamily: fonts.base,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  editInput: {
    fontFamily: fonts.base,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  exportButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  exportButtonText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  exportButtonTextCopied: {
    color: colors.positive,
    fontWeight: "500",
  },
});
