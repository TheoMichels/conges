import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, glassStyle, radius, shadows, spacing } from "../theme/colors";
import { formatDayNumber } from "../utils/format";

type Props = {
  remaining: number;
  taken: number;
  total: number;
};

export function KpiCards({ remaining, taken, total }: Props) {
  const isNegative = remaining < 0;

  return (
    <View testID="kpi-cards" style={styles.container}>
      <View
        testID="kpi-remaining"
        style={[
          styles.card,
          isNegative ? styles.cardDanger : styles.cardPositive,
        ]}
      >
        <Text style={styles.label}>Solde restant</Text>
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
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
        <Text style={styles.subtitle}>
          {isNegative ? "Dépassement de solde" : "Disponible à poser"}
        </Text>
      </View>

      <View testID="kpi-taken" style={styles.card}>
        <Text style={styles.label}>Congés pris</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, styles.valuePrimary]}>
            {formatDayNumber(taken)}
          </Text>
          <Text style={[styles.unit, styles.valuePrimary]}>j</Text>
        </View>
        <Text style={styles.subtitle}>{"Posés sur l'année"}</Text>
      </View>

      <View testID="kpi-total" style={styles.card}>
        <Text style={styles.label}>Droits totaux</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, styles.valueBrand]}>
            {formatDayNumber(total)}
          </Text>
          <Text style={[styles.unit, styles.valueBrand]}>j</Text>
        </View>
        <Text style={styles.subtitle}>Cumul annuel alloué</Text>
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
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...glassStyle,
    ...shadows.sm,
  },
  cardPositive: {
    borderLeftWidth: 4,
    borderLeftColor: colors.positive,
  },
  cardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
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
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  unit: {
    fontFamily: fonts.base,
    fontSize: 14,
    fontWeight: "700",
  },
  valuePositive: {
    color: colors.positive,
  },
  valueDanger: {
    color: colors.danger,
  },
  valuePrimary: {
    color: colors.primary,
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
