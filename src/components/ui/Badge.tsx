import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts, shape } from "../../theme/colors";

export type BadgeTone = "ok" | "warn" | "neutral" | "blue" | "danger" | "cta" | "outline";
const TONES: Record<BadgeTone, { bg: string; fg: string; border?: string }> = {
  ok: { bg: colors.positiveSoft, fg: colors.positive },
  warn: { bg: colors.warningSoft, fg: colors.warning },
  neutral: { bg: colors.divider, fg: colors.textSecondary },
  blue: { bg: colors.primarySoft, fg: colors.primary },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  cta: { bg: colors.ctaSoft, fg: colors.ctaText },
  outline: { bg: colors.panel, fg: colors.primary, border: colors.primaryBorder },
};

type Props = { label: string; tone?: BadgeTone; dot?: boolean; testID?: string; style?: StyleProp<ViewStyle> };

// Badge de statut : la couleur porte un sens (OK, alerte, brouillon…), jamais décorative.
export function Badge({ label, tone = "neutral", dot = false, testID, style }: Props) {
  const t = TONES[tone];
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: t.bg }, t.border ? { borderWidth: 1, borderColor: t.border } : null, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: shape.pill, paddingHorizontal: 8, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: fonts.base, fontSize: 12, fontWeight: "600", lineHeight: 18 },
});
