import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { cardShadow, colors, fonts, shape } from "../../theme/colors";

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string };

// Carte blanche sur fond perle, bordure fine et ombre légère.
export function Card({ children, style, testID }: Props) {
  return <View testID={testID} style={[styles.card, cardShadow, style]}>{children}</View>;
}

export function CardHeader({ title, count, right }: { title: string; count?: number | string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {count !== undefined ? <View style={styles.count}><Text style={styles.countText}>{count}</Text></View> : null}
      <View style={styles.spacer} />
      {right}
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: shape.card, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontFamily: fonts.base, fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  count: { backgroundColor: colors.divider, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  countText: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  spacer: { flex: 1 },
  eyebrow: { fontFamily: fonts.base, fontSize: 11.5, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textSecondary },
});
