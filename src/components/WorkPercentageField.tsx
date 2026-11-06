import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { parseWorkPercentage } from "../types/yearPlan";
import { colors, fonts, radius } from "../theme/colors";
import { getLuxembourgCompensatoryHolidays } from "../utils/luxembourgHolidays";
import { calculatePlanHolidays } from "../utils/yearPlanUtils";
import { formatDayNumber } from "../utils/format";

type Props = { year: string; value: number; onChange: (value: number) => void; mobile?: boolean };

export function WorkPercentageField({ year, value, onChange, mobile }: Props) {
  const [text, setText] = useState(String(value).replace(".", ","));
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const details = getLuxembourgCompensatoryHolidays(year);
  const entitlement = calculatePlanHolidays({ year, workPercentage: value });
  const change = (raw: string) => {
    setText(raw);
    const parsed = parseWorkPercentage(raw);
    setError(parsed === null);
    if (parsed !== null) onChange(parsed);
  };
  return (
    <View testID="work-percentage-field" style={styles.container}>
      <Text style={styles.label}>Taux d’activité annuel (%)</Text>
      <TextInput testID="work-percentage-input" accessibilityLabel="Taux d’activité annuel (%)"
        style={[styles.input, error && styles.invalid]} value={text} onChangeText={change}
        keyboardType="decimal-pad" selectTextOnFocus />
      {error && <Text testID="work-percentage-error" accessibilityRole="alert" style={styles.error}>
        Saisissez un taux supérieur à 0 et inférieur ou égal à 100 %, avec deux décimales maximum. Le dernier taux valide est conservé.
      </Text>}
      <Text style={styles.hint}>Seuls les fériés récupérables (week-ends et coïncidences) sont proratisés. Les autres droits restent inchangés.</Text>
      <Text testID="holiday-entitlement" style={styles.summary}>
        {details.length} jour(s) à temps plein × {formatDayNumber(value)} % = {formatDayNumber(entitlement)} jour(s) récupérable(s)
      </Text>
      {mobile && <Pressable testID="holiday-details-toggle" accessibilityRole="button"
        accessibilityLabel="Détail des fériés récupérables" accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)} style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <Text style={styles.summary}>{expanded ? "Masquer" : "Voir"} le détail des fériés</Text>
      </Pressable>}
      {mobile && expanded && <View testID="holiday-details">
        {details.length === 0 ? <Text style={styles.hint}>Aucun férié récupérable cette année.</Text> : details.map((item, index) => (
          <Text key={`${item.date}-${index}`} style={styles.hint}>{item.description}</Text>
        ))}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 20, minWidth: 0 },
  label: { fontFamily: fonts.base, color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
  input: { fontFamily: fonts.base, color: colors.textPrimary, backgroundColor: colors.surfaceActive,
    borderColor: colors.borderStrong, borderWidth: 1, borderRadius: radius.sm, padding: 12, minHeight: 44, fontSize: 16, maxWidth: 200 },
  invalid: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13, fontFamily: fonts.base },
  hint: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.base, lineHeight: 18 },
  summary: { color: colors.brand, fontSize: 13, fontFamily: fonts.base, lineHeight: 20 },
  toggle: { minHeight: 44, justifyContent: "center" },
  pressed: { opacity: 0.65 },
});
