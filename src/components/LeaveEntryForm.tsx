import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { HalfDay, LeaveEntryDraft, MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts } from "../theme/colors";
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
  const [label, setLabel] = useState(initial?.label ?? "");
  const [kind, setKind] = useState<"dates" | "month">(initial?.kind ?? "dates");
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

  const [month, setMonth] = useState(() =>
    initial?.kind === "month" ? initial.month : new Date().getMonth()
  );
  const [daysText, setDaysText] = useState(() =>
    initial?.kind === "month" ? String(initial.days) : "1"
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
  const monthDays = parseFloat(daysText.replace(",", ".")) || 0;
  const total = kind === "dates" ? dateDays : monthDays;

  const submit = () => {
    if (total <= 0) return;
    const trimmed = label.trim() || "Congés";
    onSubmit(
      kind === "dates"
        ? {
            kind: "dates",
            label: trimmed,
            startDate,
            endDate,
            startHalf,
            endHalf,
          }
        : { kind: "month", label: trimmed, month, days: monthDays }
    );
  };

  return (
    <View style={styles.form}>
      <Text style={styles.fieldLabel}>Justificatif</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="Motif des congés"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />

      <View style={styles.modeRow}>
        {(["dates", "month"] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.modeButton, kind === option && styles.modeButtonActive, cursorPointer]}
            onPress={() => setKind(option)}
          >
            <Text style={[styles.modeText, kind === option && styles.modeTextActive]}>
              {option === "dates" ? "Dates précises" : "Nombre de jours"}
            </Text>
          </Pressable>
        ))}
      </View>

      {kind === "dates" ? (
        <>
          <View style={styles.calendarContainer}>
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
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Mois</Text>
          <View style={styles.chips}>
            {MONTH_LABELS.map((name, index) => (
              <Pressable
                key={name}
                style={[styles.chip, month === index && styles.chipActive, cursorPointer]}
                onPress={() => setMonth(index)}
              >
                <Text style={[styles.chipText, month === index && styles.chipTextActive]}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Nombre de jours</Text>
          <TextInput
            style={[styles.input, styles.daysInput]}
            value={daysText}
            onChangeText={setDaysText}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.total}>
          {formatDays(total)}
          {kind === "dates" ? (total > 1 ? " ouvrés" : " ouvré") : ""}
        </Text>

        <View style={styles.actions}>
          <Pressable style={[styles.cancelButton, cursorPointer]} onPress={onCancel}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
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

const styles = StyleSheet.create({
  form: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    padding: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  subFieldLabel: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    fontFamily: fonts.base,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  daysInput: {
    width: 120,
    fontWeight: "600",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
  },
  modeButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  modeText: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeTextActive: {
    color: colors.textOnBrand,
  },
  calendarContainer: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  halfDaySection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  halfDayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  halfDayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
  },
  halfDayButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  halfDayText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  halfDayTextActive: {
    color: colors.textOnBrand,
  },
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
  halfDayOption: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
  },
  halfDayOptionActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  halfDayOptionText: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  halfDayOptionTextActive: {
    color: colors.textOnBrand,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  chipText: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textOnBrand,
  },
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
    fontSize: 15,
    fontWeight: "700",
    color: colors.brand,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
  },
  cancelText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textOnBrand,
  },
});
