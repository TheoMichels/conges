import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, shape } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDayNumber } from "../utils/format";
import { getLuxembourgCompensatoryHolidays } from "../utils/luxembourgHolidays";
import { NumberField } from "./NumberField";

type Props = {
  readOnly?: boolean;
  year: string;
  holidayIsManual: boolean;
  initialLeave: number;
  carriedOver: number;
  csupp: number;
  publicHolidays: number;
  taken: number;
  remaining: number;
  previousYear?: string;
  onChangeInitialLeave: (value: number) => void;
  onChangeCarriedOver: (value: number) => void;
  onChangeCsupp: (value: number) => void;
};

function ReadOnlyField({
  label,
  hint,
  value,
  negative,
  onPress,
}: {
  label: string;
  hint?: string;
  value: number;
  negative?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.field}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.readOnlyBox, onPress ? styles.readOnlyBoxInteractive : null]}>
        <Text style={[styles.readOnlyValue, negative && styles.readOnlyValueNegative]}>
          {formatDayNumber(value)}
        </Text>
        {onPress ? <Text style={styles.infoIcon}>ⓘ</Text> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable testID="holiday-details-toggle" accessibilityRole="button" accessibilityLabel="Détail des fériés récupérables" style={cursorPointer} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export function SummaryFields({
  readOnly = false,
  year,
  holidayIsManual,
  initialLeave,
  carriedOver,
  csupp,
  publicHolidays,
  taken,
  remaining,
  previousYear,
  onChangeInitialLeave,
  onChangeCarriedOver,
  onChangeCsupp,
}: Props) {
  const [showHolidaysDetail, setShowHolidaysDetail] = useState(false);
  const compensatoryDetails = getLuxembourgCompensatoryHolidays(year);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Détail des droits et soldes</Text>
      <View style={styles.row}>
        <View style={styles.fieldCell}><NumberField
          readOnly={readOnly}
          label="Congés (initialement)"
          value={initialLeave}
          onChange={onChangeInitialLeave}
        /></View>
        <View style={styles.fieldCell}><NumberField
          readOnly={readOnly}
          label="Reportés"
          hint={previousYear ? `de ${previousYear}` : undefined}
          value={carriedOver}
          onChange={onChangeCarriedOver}
        /></View>
        <View style={styles.fieldCell}><NumberField
          readOnly={readOnly}
          label="Csupp"
          value={csupp}
          onChange={onChangeCsupp}
        /></View>
        <View style={styles.fieldCell}><ReadOnlyField
          label="Fériés (Lux.)"
          hint={holidayIsManual ? "manuel" : "auto"}
          value={publicHolidays}
          onPress={() => setShowHolidaysDetail((v) => !v)}
        /></View>
        <View style={styles.fieldCell}><ReadOnlyField label="Pris" value={taken} /></View>
        <View style={styles.fieldCell}><ReadOnlyField label="Restant" value={remaining} negative={remaining < 0} /></View>
      </View>

      {showHolidaysDetail && (
        <View testID="holiday-details" style={styles.holidaysCard}>
          <View style={styles.holidaysCardHeader}>
            <Text style={styles.holidaysCardTitle}>
              Jours fériés récupérables au Luxembourg ({year})
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer le détail des fériés"
              style={cursorPointer}
              onPress={() => setShowHolidaysDetail(false)}
              hitSlop={12}
            >
              <Text style={styles.holidaysCardClose}>✕</Text>
            </Pressable>
          </View>
          {compensatoryDetails.length === 0 ? (
            <Text style={styles.holidaysEmpty}>
              Aucun jour férié ne tombait un week-end ou en coïncidence en {year}.
            </Text>
          ) : (
            compensatoryDetails.map((item, idx) => (
              <View key={idx} style={styles.holidayItem}>
                <Text style={styles.holidayBullet}>•</Text>
                <View style={styles.holidayContent}>
                  <Text style={styles.holidayName}>
                    {item.name} ({item.date})
                  </Text>
                  <Text style={styles.holidayDesc}>{item.description}</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.base,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
    columnGap: 20,
  },
  fieldCell: { flexBasis: "30%", flexGrow: 1, minWidth: 140 },
  field: {
    minWidth: 0,
    flex: 1,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: "hidden",
  },
  readOnlyBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
  },
  readOnlyBoxInteractive: {
    borderColor: colors.border,
  },
  readOnlyValue: {
    fontFamily: fonts.base,
    fontSize: 16,
    color: colors.textPrimary,
  },
  readOnlyValueNegative: {
    color: colors.danger,
    fontWeight: "600",
  },
  infoIcon: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.primary,
  },
  holidaysCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: shape.row,
    backgroundColor: colors.panelSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  holidaysCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  holidaysCardTitle: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  holidaysCardClose: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    padding: 4,
  },
  holidaysEmpty: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textSecondary,
  },
  holidayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  holidayBullet: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.cta,
  },
  holidayContent: {
    flex: 1,
  },
  holidayName: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  holidayDesc: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
