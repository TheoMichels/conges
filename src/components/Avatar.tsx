import { StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brandGradient, fonts } from "../theme/colors";

type Props = { label: string; size?: number; round?: boolean };

// Initiales : « theo.michels@its4u.com » → « TM », « Solde restant » → « SR ».
export function initialsOf(label: string): string {
  const base = label.split("@")[0] ?? label;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : base.slice(0, 2);
  return letters.toUpperCase();
}

// Pastille décorative à initiales sur dégradé bleu ITS4U.
export function Avatar({ label, size = 40, round = false }: Props) {
  return (
    <LinearGradient
      colors={brandGradient.colors}
      start={brandGradient.start}
      end={brandGradient.end}
      style={[styles.box, { width: size, height: size, borderRadius: round ? size / 2 : size / 4 }]}
      accessible={false}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.36) }]}>{initialsOf(label)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  text: { fontFamily: fonts.base, fontWeight: "700", color: "#FFFFFF" },
});
