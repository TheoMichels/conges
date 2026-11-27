import { ReactNode } from "react";
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts, raisedShadow } from "../../theme/colors";
import { cursorPointer } from "../../theme/webCursor";

export type SegmentOption<K extends string> = { key: K; label: string; testID?: string; accessory?: ReactNode };
type Props<K extends string> = {
  options: SegmentOption<K>[];
  value: K | null;
  onChange: (key: K) => void;
  size?: "md" | "lg";
  stretch?: boolean;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Contrôle segmenté : années, filtres d'équipe, demi-journées.
export function Segmented<K extends string>({ options, value, onChange, size = "md", stretch = false, scrollable = false, style }: Props<K>) {
  const items = options.map((option) => {
    const selected = option.key === value;
    return (
      <Pressable
        key={option.key}
        testID={option.testID}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.key)}
        style={[styles.item, size === "lg" ? styles.itemLg : styles.itemMd, stretch && styles.itemStretch, selected && styles.itemOn, selected && raisedShadow, cursorPointer]}
      >
        <Text style={[styles.text, selected && styles.textOn]} numberOfLines={2}>{option.label}</Text>
        {option.accessory}
      </Pressable>
    );
  });
  const track = <View style={[styles.track, stretch && styles.trackStretch, style]}>{items}</View>;
  if (!scrollable) return track;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>{track}</ScrollView>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, maxWidth: "100%" },
  track: { flexDirection: "row", alignSelf: "flex-start", padding: 3, gap: 2, borderRadius: 11, backgroundColor: colors.divider },
  trackStretch: { alignSelf: "stretch" },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, borderRadius: 8 },
  itemMd: { minHeight: 36 },
  itemLg: { minHeight: 44 },
  itemStretch: { flex: 1 },
  itemOn: { backgroundColor: colors.panel },
  text: { fontFamily: fonts.base, fontSize: 13, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
  textOn: { color: colors.textPrimary },
});
