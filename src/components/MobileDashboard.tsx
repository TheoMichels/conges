import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, tabular } from "../theme/colors";
import { cursorPointer } from "../theme/webCursor";
import { formatDayNumber } from "../utils/format";
import { RightsBreakdown, RightsProps } from "./SummaryFields";
import { Card } from "./ui/Card";
import { Icon } from "./ui/Icon";

type Props = Omit<RightsProps, "year"> & { year?: string };

// Mobile : composition des droits repliable sous la carte de solde.
export function MobileDashboard({ year = String(new Date().getFullYear()), ...props }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Card testID="mobile-dashboard" style={styles.card}>
      <Pressable
        testID="mobile-dashboard-toggle"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={[styles.head, cursorPointer]}
      >
        <Text style={styles.title}>Composition des droits</Text>
        <Text style={styles.total}>{formatDayNumber(props.total)} j</Text>
        <View style={open && styles.chevronOpen}><Icon name="down" size={18} color={colors.textFaint} /></View>
      </Pressable>
      {open && <View style={styles.body}><RightsBreakdown {...props} year={year} /></View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 50 },
  title: { flex: 1, fontFamily: fonts.base, fontSize: 14.5, fontWeight: "600", color: colors.textPrimary },
  total: { fontFamily: fonts.base, fontSize: 14.5, fontWeight: "700", color: colors.textPrimary, ...tabular },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  body: { borderTopWidth: 1, borderTopColor: colors.divider, paddingBottom: 6 },
});
