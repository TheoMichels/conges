import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SHORT_MONTH_LABELS } from "../types/yearPlan";
import { colors, fonts, tabular, webOnly } from "../theme/colors";
import { formatDayNumber } from "../utils/format";
import { Badge } from "./ui/Badge";
import { Card, Eyebrow } from "./ui/Card";

type Props = {
  remaining: number;
  taken: number;
  total: number;
  // Part des congés posés qui reste à venir.
  upcoming?: number;
  // Jours posés par mois (aperçu annuel, desktop).
  months?: number[];
  currentMonth?: number;
};

const HATCH = webOnly({ backgroundImage: "repeating-linear-gradient(135deg, #E3E7EE 0 6px, #EEF0F4 6px 12px)" });

// Carte « Solde restant » : chiffre principal, jauge pris / à venir / restants et aperçu annuel.
// Remplace les trois KPI de même poids ; les testID kpi-* sont conservés.
export function KpiCards({ remaining, taken, total, upcoming = 0, months, currentMonth }: Props) {
  const isMobile = useWindowDimensions().width < 768;
  const isNegative = remaining < 0;
  const scale = Math.max(total, taken, 0.0001);
  const past = Math.max(0, taken - upcoming);
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / scale) * 100))}%` as const;
  const maxMonth = Math.max(1, ...(months ?? [0]));

  return (
    <Card testID="kpi-cards" style={[styles.card, isMobile && styles.cardMobile]}>
      <View testID="kpi-remaining" style={styles.top}>
        <View style={styles.topText}>
          <Eyebrow>Solde restant</Eyebrow>
          <View style={styles.valueRow}>
            <Text style={[styles.value, isMobile && styles.valueMobile, isNegative && styles.valueDanger]}>{formatDayNumber(remaining)}</Text>
            <Text style={styles.unit}>{Math.abs(remaining) >= 2 ? "jours" : "jour"}</Text>
          </View>
        </View>
        <Badge tone={isNegative ? "danger" : "ok"} dot label={isNegative ? "Dépassement de solde" : "Disponible à poser"} />
      </View>

      <View testID="kpi-total" style={styles.totalLine}>
        <Text style={styles.totalText}>Droits totaux : </Text>
        <Text style={[styles.totalText, styles.totalValue]}>{formatDayNumber(total)}</Text>
        <Text style={styles.totalText}> j</Text>
      </View>

      <View style={styles.bar} accessibilityLabel={`${formatDayNumber(taken)} jours posés sur ${formatDayNumber(total)}`}>
        {past > 0 && <View style={[styles.segment, styles.segPast, isNegative && styles.segDanger, { width: pct(past) }]} />}
        {upcoming > 0 && <View style={[styles.segment, styles.segUpcoming, { width: pct(upcoming) }]} />}
        {remaining > 0 && <View style={[styles.segment, styles.segLeft, HATCH, { width: pct(remaining) }]} />}
      </View>

      <View style={styles.legend}>
        <View testID="kpi-taken" style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Congés pris</Text>
          <Text style={styles.legendValue}>{formatDayNumber(taken)}</Text>
          <Text style={styles.legendUnit}>j</Text>
        </View>
        {upcoming > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors.primaryLight }]} />
            <Text style={styles.legendLabel}>dont à venir</Text>
            <Text style={styles.legendValue}>{formatDayNumber(upcoming)}</Text>
            <Text style={styles.legendUnit}>j</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.swatchLeft]} />
          <Text style={styles.legendLabel}>Restants</Text>
          <Text style={[styles.legendValue, isNegative && styles.valueDanger]}>{formatDayNumber(remaining)}</Text>
          <Text style={styles.legendUnit}>j</Text>
        </View>
      </View>

      {months && (
        <View style={styles.months} accessibilityLabel="Jours posés par mois">
          {months.map((days, index) => {
            const isNow = index === currentMonth;
            const isFuture = currentMonth !== undefined && index > currentMonth;
            return (
              <View key={index} style={styles.month}>
                <Text style={styles.monthValue}>{days > 0 ? formatDayNumber(days) : ""}</Text>
                <View style={[styles.monthCol, isNow && styles.monthColNow]}>
                  {days > 0 && <View style={[styles.monthFill, isFuture && styles.monthFillFuture, { height: `${Math.max(8, (days / maxMonth) * 100)}%` }]} />}
                </View>
                <Text style={[styles.monthLabel, isNow && styles.monthLabelNow]}>{SHORT_MONTH_LABELS[index].charAt(0).toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 22 },
  cardMobile: { padding: 16 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  topText: { flex: 1 },
  valueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8, gap: 6 },
  value: { fontFamily: fonts.base, fontSize: 52, fontWeight: "700", letterSpacing: -1.6, color: colors.textPrimary, lineHeight: 56, ...tabular },
  valueMobile: { fontSize: 42, lineHeight: 46 },
  valueDanger: { color: colors.danger },
  unit: { fontFamily: fonts.base, fontSize: 18, fontWeight: "600", color: colors.textSecondary },
  totalLine: { flexDirection: "row", marginTop: 6 },
  totalText: { fontFamily: fonts.base, fontSize: 13.5, color: colors.textSecondary },
  totalValue: { fontWeight: "700", color: colors.textPrimary, ...tabular },
  bar: { flexDirection: "row", height: 10, borderRadius: 999, backgroundColor: colors.divider, overflow: "hidden", marginTop: 20, marginBottom: 12, gap: 2 },
  segment: { height: "100%" },
  segPast: { backgroundColor: colors.primary },
  segDanger: { backgroundColor: colors.danger },
  segUpcoming: { backgroundColor: colors.primaryLight },
  segLeft: { backgroundColor: "#E3E7EE" },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  swatchLeft: { backgroundColor: "#E3E7EE" },
  legendLabel: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
  legendValue: { fontFamily: fonts.base, fontSize: 13.5, fontWeight: "700", color: colors.textPrimary, marginLeft: 2, ...tabular },
  legendUnit: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary, marginLeft: -3 },
  months: { flexDirection: "row", gap: 6, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.divider },
  month: { flex: 1, alignItems: "center", gap: 5 },
  monthValue: { fontFamily: fonts.base, fontSize: 10.5, color: colors.textSecondary, height: 14, ...tabular },
  monthCol: { width: "100%", height: 44, borderRadius: 6, backgroundColor: colors.canvas, justifyContent: "flex-end", overflow: "hidden" },
  monthColNow: { borderWidth: 1.5, borderColor: colors.cta },
  monthFill: { width: "100%", backgroundColor: colors.primary, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  monthFillFuture: { backgroundColor: colors.primaryLight },
  monthLabel: { fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  monthLabelNow: { color: colors.ctaText },
});
