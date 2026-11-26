import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { HalfDay, LeaveEntryDraft } from "../types/yearPlan";
import { colors, fonts, shape } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDateFr, toISODate, workingDaysCount } from "../utils/leaveDays";
import { formatDays } from "../utils/format";
import { Calendar } from "./Calendar";

type Props = {
  year: string;
  initial?: LeaveEntryDraft;
  submitLabel?: string;
  onSubmit: (draft: LeaveEntryDraft) => void;
  onCancel: () => void;
};

function defaultDate(year: string): string {
  const today = new Date();
  const parsed = parseInt(year, 10);
  if (!Number.isFinite(parsed) || parsed === today.getFullYear()) return toISODate(today);
  return toISODate(new Date(parsed, 0, 1));
}

export function LeaveEntryForm({
  year,
  initial,
  submitLabel = "Ajouter",
  onSubmit,
  onCancel,
}: Props) {
  const isMobile = useWindowDimensions().width < 768;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [startDate, setStartDate] = useState(() =>
    initial?.kind === "dates" ? initial.startDate : defaultDate(year)
  );
  const [endDate, setEndDate] = useState(() =>
    initial?.kind === "dates" ? initial.endDate : defaultDate(year)
  );
  const [startHalf, setStartHalf] = useState<HalfDay>(() =>
    initial?.kind === "dates" ? (initial.startHalf ?? "morning") : "morning"
  );
  const [endHalf, setEndHalf] = useState<HalfDay>(() =>
    initial?.kind === "dates" ? (initial.endHalf ?? "afternoon") : "afternoon"
  );

  const handleSelectRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (start === end && startHalf === "afternoon" && endHalf === "morning") {
      setStartHalf("morning");
      setEndHalf("afternoon");
    }
  };

  const isSingleDay = startDate === endDate;

  const dateDays = workingDaysCount(startDate, endDate, startHalf, endHalf);
  const total = dateDays;

  const submit = () => {
    if (total <= 0) return;
    const trimmed = label.trim() || "Congés";
    onSubmit({ kind: "dates", label: trimmed, startDate, endDate, startHalf, endHalf });
  };

  return (
    <View style={[styles.form, isMobile && styles.formMobile]}>
      <Text style={styles.fieldLabel}>Justificatif</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="Motif des congés"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />

          <View style={[styles.calendarContainer, isMobile && styles.calendarContainerMobile]}>
            <Calendar
              startDate={startDate}
              endDate={endDate}
              onSelectRange={handleSelectRange}
            />
          </View>

          {/* Half-day selection */}
          <View style={styles.halfDaySection}>
            <Text style={styles.fieldLabel}>Durée de l&apos;absence</Text>
            {isSingleDay ? (
              <View style={styles.halfDayRow}>
                {[
                  {
                    id: "full",
                    label: "Journée entière (1 j)",
                    start: "morning" as HalfDay,
                    end: "afternoon" as HalfDay,
                  },
                  {
                    id: "morning",
                    label: "Matin (0,5 j)",
                    start: "morning" as HalfDay,
                    end: "morning" as HalfDay,
                  },
                  {
                    id: "afternoon",
                    label: "Après-midi (0,5 j)",
                    start: "afternoon" as HalfDay,
                    end: "afternoon" as HalfDay,
                  },
                ].map((opt) => {
                  const active =
                    startHalf === opt.start && endHalf === opt.end;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.halfDayButton,
                        active && styles.halfDayButtonActive,
                        cursorPointer,
                      ]}
                      onPress={() => {
                        setStartHalf(opt.start);
                        setEndHalf(opt.end);
                      }}
                    >
                      <Text
                        style={[
                          styles.halfDayText,
                          active && styles.halfDayTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.multiDayHalfRow}>
                <View style={styles.halfDayCol}>
                  <Text style={styles.subFieldLabel}>
                    Premier jour ({formatDateFr(startDate)})
                  </Text>
                  <View style={styles.halfDayGroup}>
                    <Pressable
                      style={[
                        styles.halfDayOption,
                        startHalf === "morning" && styles.halfDayOptionActive,
                        cursorPointer,
                      ]}
                      onPress={() => setStartHalf("morning")}
                    >
                      <Text
                        style={[
                          styles.halfDayOptionText,
                          startHalf === "morning" && styles.halfDayOptionTextActive,
                        ]}
                      >
                        Toute la journée
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.halfDayOption,
                        startHalf === "afternoon" && styles.halfDayOptionActive,
                        cursorPointer,
                      ]}
                      onPress={() => setStartHalf("afternoon")}
                    >
                      <Text
                        style={[
                          styles.halfDayOptionText,
                          startHalf === "afternoon" && styles.halfDayOptionTextActive,
                        ]}
                      >
                        Dès l&apos;après-midi (-0,5 j)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.halfDayCol}>
                  <Text style={styles.subFieldLabel}>
                    Dernier jour ({formatDateFr(endDate)})
                  </Text>
                  <View style={styles.halfDayGroup}>
                    <Pressable
                      style={[
                        styles.halfDayOption,
                        endHalf === "morning" && styles.halfDayOptionActive,
                        cursorPointer,
                      ]}
                      onPress={() => setEndHalf("morning")}
                    >
                      <Text
                        style={[
                          styles.halfDayOptionText,
                          endHalf === "morning" && styles.halfDayOptionTextActive,
                        ]}
                      >
                        Jusqu&apos;au midi (-0,5 j)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.halfDayOption,
                        endHalf === "afternoon" && styles.halfDayOptionActive,
                        cursorPointer,
                      ]}
                      onPress={() => setEndHalf("afternoon")}
                    >
                      <Text
                        style={[
                          styles.halfDayOptionText,
                          endHalf === "afternoon" && styles.halfDayOptionTextActive,
                        ]}
                      >
                        Toute la journée
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>

      <View style={styles.footer}>
        <Text testID="leave-day-total" style={styles.total}>
          {formatDays(total)}
          {total > 1 ? " ouvrés" : " ouvré"}
        </Text>

        <View style={styles.actions}>
          <Pressable style={[styles.cancelButton, cursorPointer]} onPress={onCancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            testID="submit-leave-button"
            style={[styles.submitButton, total <= 0 && styles.submitDisabled, cursorPointer]}
            onPress={submit}
            disabled={total <= 0}
          >
            <Text style={styles.submitText}>{submitLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const OPTION = {
  minHeight: 44,
  justifyContent: "center" as const,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.panel,
};
const OPTION_ACTIVE = {
  borderColor: colors.primaryBorder,
  backgroundColor: colors.primarySoft,
};
const OPTION_TEXT = {
  fontFamily: fonts.base,
  fontSize: 13,
  fontWeight: "600" as const,
  color: colors.textSecondary,
};
const OPTION_TEXT_ACTIVE = { color: colors.primary };

const styles = StyleSheet.create({
  form: {
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSubtle,
    padding: 20,
    marginBottom: 16,
  },
  formMobile: { padding: 4, borderWidth: 0, backgroundColor: "transparent" },
  fieldLabel: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  subFieldLabel: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    justifyContent: "center",
    fontFamily: fonts.base,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  daysInput: {
    width: 120,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeButton: { ...OPTION, paddingHorizontal: 16, paddingVertical: 8 },
  modeButtonActive: OPTION_ACTIVE,
  modeText: OPTION_TEXT,
  modeTextActive: OPTION_TEXT_ACTIVE,
  calendarContainer: {
    alignSelf: "flex-start",
    marginBottom: 16,
    padding: 12,
    borderRadius: shape.row,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  calendarContainerMobile: { padding: 0, borderWidth: 0, backgroundColor: "transparent" },
  halfDaySection: {
    marginBottom: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  halfDayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  halfDayButton: { ...OPTION, paddingHorizontal: 14, paddingVertical: 8 },
  halfDayButtonActive: OPTION_ACTIVE,
  halfDayText: OPTION_TEXT,
  halfDayTextActive: OPTION_TEXT_ACTIVE,
  multiDayHalfRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  halfDayCol: {
    flex: 1,
    minWidth: 200,
  },
  halfDayGroup: {
    flexDirection: "row",
    gap: 6,
  },
  halfDayOption: { ...OPTION, flex: 1, paddingHorizontal: 10, paddingVertical: 7, alignItems: "center" },
  halfDayOptionActive: OPTION_ACTIVE,
  halfDayOptionText: { ...OPTION_TEXT, fontSize: 12, textAlign: "center" },
  halfDayOptionTextActive: OPTION_TEXT_ACTIVE,
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: { ...OPTION, borderRadius: shape.pill, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: OPTION_TEXT,
  chipTextActive: { color: colors.textOnBrand },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  total: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.cta,
    backgroundColor: colors.ctaSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shape.pill,
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  cancelText: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textPrimary,
  },
  submitButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.cta,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textOnBrand,
  },
});
