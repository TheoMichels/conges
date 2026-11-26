import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, fonts, shape, statusHalo } from "../theme/colors";
import { formatDayNumber } from "../utils/format";
import { Avatar } from "./Avatar";

type Props = {
  remaining: number;
  taken: number;
  total: number;
};

type CardProps = {
  testID: string;
  label: string;
  subtitle: string;
  value: number;
  isMobile: boolean;
  negative?: boolean;
  status?: "ok" | "danger";
};

function KpiCard({ testID, label, subtitle, value, isMobile, negative, status }: CardProps) {
  return (
    <View testID={testID} style={[styles.card, isMobile && styles.cardMobile, negative && styles.cardDanger]}>
      <View style={styles.head}>
        {!isMobile && <Avatar label={label} size={44} round />}
        <View style={styles.headText}>
          <Text style={[styles.label, isMobile && styles.labelMobile]}>{label}</Text>
          {!isMobile && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {!isMobile && status && (
          <View
            style={[
              styles.dot,
              status === "danger" ? styles.dotDanger : styles.dotOk,
              statusHalo(status === "danger" ? colors.dangerSoft : colors.positiveSoft),
            ]}
          />
        )}
      </View>
      <View style={[styles.valueRow, isMobile && styles.valueRowMobile]}>
        <Text style={[styles.value, isMobile && styles.valueMobile, negative && styles.valueDanger]}>
          {formatDayNumber(value)}
        </Text>
        <Text style={[styles.unit, isMobile && styles.unitMobile]}>j</Text>
      </View>
      {isMobile && <Text style={[styles.subtitle, styles.subtitleMobile]}>{subtitle}</Text>}
    </View>
  );
}

export function KpiCards({ remaining, taken, total }: Props) {
  const isMobile = useWindowDimensions().width < 768;
  const isNegative = remaining < 0;

  return (
    <View testID="kpi-cards" style={[styles.container, isMobile && styles.containerMobile]}>
      <KpiCard
        testID="kpi-remaining"
        label="Solde restant"
        subtitle={isNegative ? "Dépassement de solde" : "Disponible à poser"}
        value={remaining}
        isMobile={isMobile}
        negative={isNegative}
        status={isNegative ? "danger" : "ok"}
      />
      <KpiCard
        testID="kpi-taken"
        label="Congés pris"
        subtitle={"Posés sur l'année"}
        value={taken}
        isMobile={isMobile}
      />
      <KpiCard
        testID="kpi-total"
        label="Droits totaux"
        subtitle="Cumul annuel alloué"
        value={total}
        isMobile={isMobile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 20,
  },
  containerMobile: { flexWrap: "nowrap", gap: 8, marginBottom: 14 },
  card: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.panel,
    borderRadius: shape.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  cardMobile: { minWidth: 0, padding: 12, borderRadius: shape.row },
  cardDanger: {
    borderColor: "#F5C2C2",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  labelMobile: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  subtitle: {
    fontFamily: fonts.base,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleMobile: { fontSize: 10, marginTop: 0 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOk: { backgroundColor: colors.statusOk },
  dotDanger: { backgroundColor: colors.danger },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 18,
  },
  valueRowMobile: { marginTop: 4 },
  value: {
    fontFamily: fonts.base,
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  valueMobile: { fontSize: 28, letterSpacing: -0.5 },
  valueDanger: {
    color: colors.danger,
  },
  unit: {
    fontFamily: fonts.base,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: 4,
  },
  unitMobile: { fontSize: 13, marginLeft: 2 },
});
