import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, glassStyle, radius, shadows } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDayNumber } from "../utils/format";
import { getLuxembourgCompensatoryHolidays } from "../utils/luxembourgHolidays";
import { NumberField } from "./NumberField";

type Props = {
  year: string;
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
      <Pressable style={cursorPointer} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export function SummaryFields({
  year,
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
        <NumberField
          label="Congés (initialement)"
          value={initialLeave}
          onChange={onChangeInitialLeave}
        />
        <NumberField
          label="Reportés"
          hint={previousYear ? `de ${previousYear}` : undefined}
          value={carriedOver}
          onChange={onChangeCarriedOver}
        />
        <NumberField
          label="Csupp"
          value={csupp}
          onChange={onChangeCsupp}
        />
        <ReadOnlyField
          label="Fériés (Lux.)"
          hint="auto"
          value={publicHolidays}
          onPress={() => setShowHolidaysDetail((v) => !v)}
        />
        <ReadOnlyField label="Pris" value={taken} />
        <ReadOnlyField label="Restant" value={remaining} negative={remaining < 0} />
      </View>

      {showHolidaysDetail && (
        <View style={styles.holidaysCard}>
          <View style={styles.holidaysCardHeader}>
            <Text style={styles.holidaysCardTitle}>
              Jours fériés récupérables au Luxembourg ({year})
            </Text>
            <Pressable
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
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  field: {
    minWidth: 140,
    flex: 1,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "500",
    color: colors.brandMuted,
    backgroundColor: colors.panelSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  readOnlyBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceActive,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  readOnlyBoxInteractive: {
    borderColor: colors.borderStrong,
  },
  readOnlyValue: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: "700",
    color: colors.brand,
  },
  readOnlyValueNegative: {
    color: colors.danger,
  },
  infoIcon: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.brandMuted,
  },
  holidaysCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceActive,
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
  },
  holidaysCardClose: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    padding: 4,
  },
  holidaysEmpty: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.textMuted,
  },
  holidayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 6,
  },
  holidayBullet: {
    fontFamily: fonts.base,
    fontSize: 13,
    color: colors.brand,
  },
  holidayContent: {
    flex: 1,
  },
  holidayName: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  holidayDesc: {
    fontFamily: fonts.base,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
