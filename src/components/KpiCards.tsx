import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, fonts, glassStyle, radius, shadows, spacing } from "../theme/colors";
import { formatDayNumber } from "../utils/format";

type Props = {
  remaining: number;
  taken: number;
  total: number;
};

export function KpiCards({ remaining, taken, total }: Props) {
  const isMobile = useWindowDimensions().width < 768;
  const isNegative = remaining < 0;

  return (
    <View testID="kpi-cards" style={[styles.container, isMobile && styles.containerMobile]}>
      <View
        testID="kpi-remaining"
        style={[
          styles.card,
          isMobile && styles.cardMobile,
          isNegative ? styles.cardDanger : styles.cardPositive,
        ]}
      >
        <Text style={[styles.label, isMobile && styles.labelMobile]}>Solde restant</Text>
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
              isMobile && styles.valueMobile,
              isNegative ? styles.valueDanger : styles.valuePositive,
            ]}
          >
            {formatDayNumber(remaining)}
          </Text>
          <Text
            style={[
              styles.unit,
              isNegative ? styles.valueDanger : styles.valuePositive,
            ]}
          >
            j
          </Text>
        </View>
        <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
          {isNegative ? "Dépassement de solde" : "Disponible à poser"}
        </Text>
      </View>

      <View testID="kpi-taken" style={[styles.card, isMobile && styles.cardMobile]}>
        <Text style={[styles.label, isMobile && styles.labelMobile]}>Congés pris</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, isMobile && styles.valueMobile, styles.valuePrimary]}>
            {formatDayNumber(taken)}
          </Text>
          <Text style={[styles.unit, styles.valuePrimary]}>j</Text>
        </View>
        <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>{"Posés sur l'année"}</Text>
      </View>

      <View testID="kpi-total" style={[styles.card, isMobile && styles.cardMobile]}>
        <Text style={[styles.label, isMobile && styles.labelMobile]}>Droits totaux</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, isMobile && styles.valueMobile, styles.valueBrand]}>
            {formatDayNumber(total)}
          </Text>
          <Text style={[styles.unit, styles.valueBrand]}>j</Text>
        </View>
        <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>Cumul annuel alloué</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  containerMobile: { flexWrap: "nowrap", gap: spacing.sm },
  cardMobile: { minWidth: 0, padding: spacing.md },
  labelMobile: { fontSize: 10 },
  valueMobile: { fontSize: 34 },
  subtitleMobile: { fontSize: 10 },
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...glassStyle,
    ...shadows.sm,
  },
  cardPositive: {
    backgroundColor: colors.accentSurface,
  },
  cardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    letterSpacing: 0,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fonts.base,
    fontSize: 43,
    fontWeight: "400",
    letterSpacing: -0.5,
  },
  unit: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "500",
  },
  valuePositive: {
    color: colors.textPrimary,
  },
  valueDanger: {
    color: colors.danger,
  },
  valuePrimary: {
    color: colors.textPrimary,
  },
  valueBrand: {
    color: colors.brand,
  },
  subtitle: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
