import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, shape, tabular } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDayNumber } from "../utils/format";
import { getLuxembourgCompensatoryHolidays } from "../utils/luxembourgHolidays";
import { NumberField } from "./NumberField";
import { Badge } from "./ui/Badge";
import { Card, CardHeader } from "./ui/Card";
import { Icon } from "./ui/Icon";

export type RightsProps = {
  readOnly?: boolean;
  year: string;
  holidayIsManual: boolean;
  initialLeave: number;
  carriedOver: number;
  csupp: number;
  publicHolidays: number;
  total: number;
  previousYear?: string;
  onChangeInitialLeave: (value: number) => void;
  onChangeCarriedOver: (value: number) => void;
  onChangeCsupp: (value: number) => void;
};

function Row({ op, label, children, accessory, total = false }: { op?: string; label: string; children: React.ReactNode; accessory?: React.ReactNode; total?: boolean }) {
  return (
    <View style={[styles.row, total && styles.rowTotal]}>
      <Text style={styles.op}>{op ?? ""}</Text>
      <View style={styles.key}>
        <Text style={[styles.keyText, total && styles.keyTotal]}>{label}</Text>
        {accessory}
      </View>
      {children}
    </View>
  );
}

function ReadValue({ value, unit = false, large = false }: { value: number; unit?: boolean; large?: boolean }) {
  return <Text style={[styles.readValue, large && styles.readValueLarge]}>{formatDayNumber(value)}{unit ? " j" : ""}</Text>;
}

// Composition des droits sous forme d'addition : Initial + Reportés + Csupp + Fériés = Total.
export function RightsBreakdown({ readOnly = false, year, holidayIsManual, initialLeave, carriedOver, csupp, publicHolidays, total, previousYear, onChangeInitialLeave, onChangeCarriedOver, onChangeCsupp }: RightsProps) {
  const [showHolidaysDetail, setShowHolidaysDetail] = useState(false);
  const compensatoryDetails = getLuxembourgCompensatoryHolidays(year);
  const field = (label: string, value: number, onChange: (value: number) => void) =>
    readOnly ? <ReadValue value={value} /> : <NumberField inline label={label} value={value} onChange={onChange} />;

  return (
    <View>
      <Row label="Congés initiaux">{field("Congés (initialement)", initialLeave, onChangeInitialLeave)}</Row>
      <Row op="+" label="Reportés" accessory={previousYear ? <Badge label={`de ${previousYear}`} /> : null}>{field("Reportés", carriedOver, onChangeCarriedOver)}</Row>
      <Row op="+" label="Congés supplémentaires (Csupp)">{field("Csupp", csupp, onChangeCsupp)}</Row>
      <Row
        op="+"
        label="Fériés récupérables"
        accessory={
          <>
            <Badge label={holidayIsManual ? "manuel" : "auto"} tone={holidayIsManual ? "cta" : "neutral"} />
            <Pressable
              testID="holiday-details-toggle"
              accessibilityRole="button"
              accessibilityLabel="Détail des fériés récupérables"
              onPress={() => setShowHolidaysDetail((v) => !v)}
              hitSlop={10}
              style={[styles.infoButton, cursorPointer]}
            >
              <Icon name="info" size={14} color={colors.primary} />
            </Pressable>
          </>
        }
      >
        <ReadValue value={publicHolidays} />
      </Row>
      {showHolidaysDetail && (
        <View testID="holiday-details" style={styles.holidaysCard}>
          <View style={styles.holidaysCardHeader}>
            <Text style={styles.holidaysCardTitle}>Jours fériés récupérables au Luxembourg ({year})</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail des fériés" style={cursorPointer} onPress={() => setShowHolidaysDetail(false)} hitSlop={12}>
              <Icon name="x" size={15} />
            </Pressable>
          </View>
          {compensatoryDetails.length === 0 ? (
            <Text style={styles.holidaysEmpty}>Aucun jour férié ne tombait un week-end ou en coïncidence en {year}.</Text>
          ) : (
            compensatoryDetails.map((item, idx) => (
              <View key={idx} style={styles.holidayItem}>
                <View style={styles.holidayBullet} />
                <View style={styles.holidayContent}>
                  <Text style={styles.holidayName}>{item.name} ({item.date})</Text>
                  <Text style={styles.holidayDesc}>{item.description}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
      <Row op="=" label="Total des droits" total><ReadValue value={total} unit large /></Row>
    </View>
  );
}

export function SummaryFields(props: RightsProps) {
  return (
    <Card style={styles.card}>
      <CardHeader title="Composition des droits" right={props.readOnly ? <Text style={styles.hintText}>Défini par l’administration</Text> : undefined} />
      <View style={styles.body}><RightsBreakdown {...props} /></View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 },
  body: { marginTop: 6 },
  hintText: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowTotal: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 52, marginTop: -1 },
  op: { width: 14, textAlign: "center", fontFamily: fonts.base, fontSize: 14, fontWeight: "700", color: colors.textFaint },
  key: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  keyText: { fontFamily: fonts.base, fontSize: 14, color: colors.textBody },
  keyTotal: { fontWeight: "700", color: colors.textPrimary },
  readValue: { fontFamily: fonts.base, fontSize: 15, fontWeight: "600", color: colors.textPrimary, minWidth: 60, textAlign: "right", paddingRight: 11, ...tabular },
  readValueLarge: { fontSize: 17, fontWeight: "700" },
  infoButton: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  holidaysCard: { marginVertical: 10, padding: 14, borderRadius: shape.row, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  holidaysCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 },
  holidaysCardTitle: { flex: 1, fontFamily: fonts.base, fontSize: 13.5, fontWeight: "700", color: colors.textPrimary },
  holidaysEmpty: { fontFamily: fonts.base, fontSize: 13.5, color: colors.textSecondary },
  holidayItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  holidayBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cta, marginTop: 7 },
  holidayContent: { flex: 1 },
  holidayName: { fontFamily: fonts.base, fontSize: 13.5, fontWeight: "600", color: colors.textPrimary },
  holidayDesc: { fontFamily: fonts.base, fontSize: 12.5, color: colors.textSecondary },
});
