import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { HalfDay, LeaveEntryDraft } from "../types/yearPlan";
import { colors, focusRing, fonts, shape, tabular, webOnly } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDateFr, toISODate, workingDaysCount } from "../utils/leaveDays";
import { formatDayNumber, formatDays } from "../utils/format";
import { Calendar } from "./Calendar";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Segmented } from "./ui/Segmented";

type Props = {
  year: string;
  initial?: LeaveEntryDraft;
  submitLabel?: string;
  // Solde restant actuel et durée du congé modifié : affichent le « solde après ».
  remaining?: number;
  initialDays?: number;
  takenDates?: Set<string>;
  onSubmit: (draft: LeaveEntryDraft) => void;
  onCancel: () => void;
};

function defaultDate(year: string): string {
  const today = new Date();
  const parsed = parseInt(year, 10);
  if (!Number.isFinite(parsed) || parsed === today.getFullYear()) return toISODate(today);
  return toISODate(new Date(parsed, 0, 1));
}

type SingleMode = "full" | "morning" | "afternoon";
const SINGLE_MODES: Record<SingleMode, { label: string; start: HalfDay; end: HalfDay }> = {
  full: { label: "Journée entière (1 j)", start: "morning", end: "afternoon" },
  morning: { label: "Matin (0,5 j)", start: "morning", end: "morning" },
  afternoon: { label: "Après-midi (0,5 j)", start: "afternoon", end: "afternoon" },
};

export function LeaveEntryForm({ year, initial, submitLabel = "Ajouter", remaining, initialDays = 0, takenDates, onSubmit, onCancel }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isWide = width >= 1100;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [labelFocused, setLabelFocused] = useState(true);
  const [startDate, setStartDate] = useState(() => (initial?.kind === "dates" ? initial.startDate : defaultDate(year)));
  const [endDate, setEndDate] = useState(() => (initial?.kind === "dates" ? initial.endDate : defaultDate(year)));
  const [startHalf, setStartHalf] = useState<HalfDay>(() => (initial?.kind === "dates" ? (initial.startHalf ?? "morning") : "morning"));
  const [endHalf, setEndHalf] = useState<HalfDay>(() => (initial?.kind === "dates" ? (initial.endHalf ?? "afternoon") : "afternoon"));

  const handleSelectRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (start === end && startHalf === "afternoon" && endHalf === "morning") {
      setStartHalf("morning");
      setEndHalf("afternoon");
    }
  };

  const isSingleDay = startDate === endDate;
  const total = workingDaysCount(startDate, endDate, startHalf, endHalf);
  const balanceAfter = remaining === undefined ? undefined : Math.round((remaining + initialDays - total) * 100) / 100;
  const singleMode = (Object.keys(SINGLE_MODES) as SingleMode[]).find((key) => SINGLE_MODES[key].start === startHalf && SINGLE_MODES[key].end === endHalf) ?? null;

  const submit = () => {
    if (total <= 0) return;
    const trimmed = label.trim() || "Congés";
    onSubmit({ kind: "dates", label: trimmed, startDate, endDate, startHalf, endHalf });
  };

  const labelField = (
      <View>
        <Text style={styles.fieldLabel}>Justificatif</Text>
        <TextInput
          style={[styles.input, labelFocused && styles.inputFocused, labelFocused && focusRing]}
          value={label}
          onChangeText={setLabel}
          onFocus={() => setLabelFocused(true)}
          onBlur={() => setLabelFocused(false)}
          placeholder="Motif des congés"
          placeholderTextColor={colors.textFaint}
          autoFocus
        />
      </View>
  );

  const details = (
    <View style={styles.details}>
      {isWide && labelField}
      <View style={styles.halfDaySection}>
        <Text style={styles.fieldLabel}>Durée de l&apos;absence</Text>
        {isSingleDay ? (
          <Segmented
            size="lg"
            stretch
            value={singleMode}
            onChange={(key) => { setStartHalf(SINGLE_MODES[key].start); setEndHalf(SINGLE_MODES[key].end); }}
            options={(Object.keys(SINGLE_MODES) as SingleMode[]).map((key) => ({ key, label: SINGLE_MODES[key].label }))}
          />
        ) : (
          <View style={[styles.multiDayHalfRow, isMobile && styles.multiDayHalfRowMobile]}>
            <View style={styles.halfDayCol}>
              <Text style={styles.subFieldLabel}>Premier jour · {formatDateFr(startDate)}</Text>
              <Segmented
                size="lg"
                stretch
                value={startHalf}
                onChange={setStartHalf}
                options={[{ key: "morning", label: "Toute la journée" }, { key: "afternoon", label: "Dès l'après-midi (-0,5 j)" }]}
              />
            </View>
            <View style={styles.halfDayCol}>
              <Text style={styles.subFieldLabel}>Dernier jour · {formatDateFr(endDate)}</Text>
              <Segmented
                size="lg"
                stretch
                value={endHalf}
                onChange={setEndHalf}
                options={[{ key: "afternoon", label: "Toute la journée" }, { key: "morning", label: "Jusqu'au midi (-0,5 j)" }]}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.recap}>
        <View style={styles.recapItem}>
          <Text style={styles.recapLabel}>Durée</Text>
          <Text testID="leave-day-total" style={[styles.recapValue, total <= 0 && styles.recapDanger]}>
            {formatDays(total)}
            {total > 1 ? " ouvrés" : " ouvré"}
          </Text>
        </View>
        {balanceAfter !== undefined && (
          <>
            <View style={styles.recapSep} />
            <View style={styles.recapItem}>
              <Text style={styles.recapLabel}>Solde après</Text>
              <Text style={[styles.recapValue, balanceAfter < 0 ? styles.recapDanger : styles.recapOk]}>{formatDayNumber(balanceAfter)} j</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.form, isMobile && styles.formMobile, webOnly({ boxShadow: "0 0 0 4px rgba(31, 78, 121, 0.05)" })]}>
      <View style={styles.formHeader}>
        <Icon name="calendar" size={17} color={colors.primary} />
        <Text style={styles.formTitle}>{initial ? "Modifier le congé" : "Nouveau congé"}</Text>
        <View style={styles.spacer} />
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le formulaire" onPress={onCancel} style={[styles.close, cursorPointer]}>
          <Icon name="x" size={16} />
        </Pressable>
      </View>

      {!isWide && <View style={styles.labelTop}>{labelField}</View>}
      <View style={[styles.body, isWide && styles.bodyWide]}>
        <View style={[styles.calendarCol, isWide && styles.calendarColWide]}>
          <Calendar startDate={startDate} endDate={endDate} onSelectRange={handleSelectRange} takenDates={takenDates} cellSize={isMobile ? 40 : 44} />
        </View>
        <View style={[styles.detailsCol, isWide && styles.detailsColWide]}>{details}</View>
      </View>

      <View style={styles.footer}>
        <Button label="Annuler" onPress={onCancel} />
        <Button testID="submit-leave-button" variant="primary" icon="check" label={submitLabel} onPress={submit} disabled={total <= 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginHorizontal: 20, marginTop: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: 14, backgroundColor: colors.panel },
  formMobile: { marginHorizontal: 0 },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 18, paddingRight: 6, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.divider },
  formTitle: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  spacer: { flex: 1 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  body: { flexDirection: "column" },
  bodyWide: { flexDirection: "row" },
  calendarCol: { padding: 16, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider },
  calendarColWide: { borderBottomWidth: 0, borderRightWidth: 1, borderRightColor: colors.divider, paddingHorizontal: 18 },
  detailsCol: { padding: 16 },
  detailsColWide: { flex: 1, minWidth: 0, paddingHorizontal: 20 },
  details: { gap: 18 },
  labelTop: { paddingHorizontal: 16, paddingTop: 14 },
  fieldLabel: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  subFieldLabel: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
  input: { fontFamily: fonts.base, fontSize: 15, color: colors.textPrimary, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: shape.control, paddingHorizontal: 12, backgroundColor: colors.panel },
  inputFocused: { borderColor: colors.primary },
  halfDaySection: {},
  multiDayHalfRow: { flexDirection: "row", gap: 14 },
  multiDayHalfRowMobile: { flexDirection: "column" },
  halfDayCol: { flex: 1, minWidth: 0 },
  recap: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 18, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas },
  recapItem: { gap: 2 },
  recapLabel: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
  recapValue: { fontFamily: fonts.base, fontSize: 17, fontWeight: "700", color: colors.textPrimary, ...tabular },
  recapOk: { color: colors.positive },
  recapDanger: { color: colors.danger },
  recapSep: { width: 1, height: 32, backgroundColor: colors.border },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: "#FCFCFD", borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
});
