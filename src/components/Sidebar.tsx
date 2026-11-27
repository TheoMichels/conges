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
import { colors, focusRing, fonts, raisedShadow, tabular } from "../theme/colors";
import { Badge } from "./ui/Badge";
import { Icon } from "./ui/Icon";
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
      <Text style={styles.eyebrow}>Années</Text>
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
                style={[styles.editInput, focusRing]}
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
                  style={[styles.confirmButton, cursorPointer]}
                  accessibilityRole="button"
                  accessibilityLabel={`Confirmer la suppression de ${plan.year}`}
                  onPress={() => {
                    onDelete(plan.id);
                    setConfirmDeleteId(null);
                  }}
                  hitSlop={8}
                >
                  <Icon name="check" size={16} color={colors.danger} strokeWidth={2.2} />
                </Pressable>
                <Pressable
                  style={[styles.confirmButton, cursorPointer]}
                  accessibilityRole="button"
                  accessibilityLabel="Annuler la suppression"
                  onPress={() => setConfirmDeleteId(null)}
                  hitSlop={8}
                >
                  <Icon name="x" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            );
          }

          const showActions = selected && !readOnly;
          return (
            <View
              key={plan.id}
              style={[styles.item, selected && styles.itemSelected, selected && raisedShadow]}
            >
              {selected ? <View style={styles.selectedBar} /> : null}
              <Pressable
                style={[styles.itemPressable, cursorPointer]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(plan.id)}
              >
                <Text style={styles.itemText} numberOfLines={1}>{plan.year}</Text>
                {isCurrentYear && <Badge label="En cours" tone="outline" />}
                {!showActions && (
                  <Text style={[styles.remaining, remaining < 0 && styles.remainingNegative]} numberOfLines={1}>
                    {formatDayNumber(remaining)} j{selected ? "" : " restants"}
                  </Text>
                )}
              </Pressable>
              {showActions && (
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
                    hitSlop={4}
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
                    hitSlop={4}
                  >
                    <ActionIcon name="delete" />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!readOnly && (isAdding ? (
        <TextInput
          style={[styles.addInput, focusRing]}
          value={draft}
          onChangeText={setDraft}
          placeholder="AAAA"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          maxLength={4}
          onSubmitEditing={commitAdd}
          onBlur={commitAdd}
          autoFocus
        />
      ) : (
        <Pressable style={[styles.addButton, cursorPointer]} accessibilityRole="button" onPress={startAdding}>
          <Text style={styles.addButtonText}>+ Ajouter une année</Text>
        </Pressable>
      ))}

      {readOnly && <Text style={styles.footNote}>Les années et les droits sont gérés par l’administration.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { flex: 1 },
  eyebrow: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textSecondary, marginTop: 6, marginBottom: 10, marginLeft: 10 },
  list: { flexGrow: 0, flexShrink: 1 },
  item: { flexDirection: "row", alignItems: "center", minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "transparent", marginBottom: 4, position: "relative" },
  itemSelected: { backgroundColor: colors.panel, borderColor: colors.border },
  selectedBar: { position: "absolute", left: -1, top: 12, bottom: 12, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.cta },
  itemPressable: { flex: 1, minWidth: 0, minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 10 },
  itemText: { fontFamily: fonts.base, fontSize: 15, fontWeight: "700", color: colors.textPrimary, flexShrink: 0 },
  remaining: { marginLeft: "auto", fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary, ...tabular },
  remainingNegative: { color: colors.danger, fontWeight: "600" },
  actionButtons: { flexDirection: "row", alignItems: "center" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  iconButtonPressed: { opacity: 0.6 },
  confirmItem: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder, paddingLeft: 12 },
  confirmText: { fontFamily: fonts.base, flex: 1, fontSize: 13, fontWeight: "600", color: colors.danger },
  confirmButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  addButton: { marginTop: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.borderDashed, borderStyle: "dashed", alignItems: "center" },
  addButtonText: { fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600", color: colors.textSecondary },
  addInput: { fontFamily: fonts.base, marginTop: 8, paddingHorizontal: 12, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.panel, color: colors.textPrimary, fontSize: 15, fontWeight: "700", textAlign: "center" },
  editInput: { fontFamily: fonts.base, paddingHorizontal: 12, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.panel, color: colors.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 4 },
  footNote: { fontFamily: fonts.base, fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginTop: 18, marginHorizontal: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
});
