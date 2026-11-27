import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, focusRing, fonts, shape, tabular } from "../theme/colors";
import { formatDayNumber } from "../utils/format";

type Props = {
  label: string;
  hint?: string;
  readOnly?: boolean;
  value: number;
  onChange: (value: number) => void;
  // Variante compacte alignée à droite (lignes « Composition des droits »).
  inline?: boolean;
};

// Affichage en virgule décimale (fr-FR) ; la saisie accepte la virgule et le point.
function formatNumber(n: number): string {
  return n === 0 ? "0" : formatDayNumber(n);
}

function parseNumber(raw: string): number {
  const parsed = parseFloat(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function NumberField({ label, hint, value, onChange, readOnly = false, inline = false }: Props) {
  const [text, setText] = useState(() => formatNumber(value));
  const [focused, setFocused] = useState(false);
  const lastPropagated = useRef(value);

  useEffect(() => {
    if (value !== lastPropagated.current) {
      setText(formatNumber(value));
      lastPropagated.current = value;
    }
  }, [value]);

  const handleChangeText = (raw: string) => {
    setText(raw);
    const next = parseNumber(raw);
    lastPropagated.current = next;
    onChange(next);
  };

  const handleBlur = () => {
    setFocused(false);
    setText(formatNumber(lastPropagated.current));
  };

  const input = (
    <TextInput
      accessibilityLabel={label}
      style={[styles.input, inline && styles.inputInline, readOnly && styles.inputReadOnly, focused && styles.inputFocused, focused && focusRing]}
      editable={!readOnly}
      value={text}
      onChangeText={handleChangeText}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      keyboardType="decimal-pad"
      selectTextOnFocus
    />
  );

  if (inline) return input;

  return (
    <View style={styles.field}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {input}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minWidth: 120, flex: 1 },
  labelContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  label: { fontFamily: fonts.base, fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  hint: { fontFamily: fonts.base, fontSize: 11, fontWeight: "600", color: colors.textSecondary, backgroundColor: colors.divider, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: "hidden" },
  input: {
    fontFamily: fonts.base,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: shape.control,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    minHeight: 44,
    ...tabular,
  },
  inputInline: { width: 84, minHeight: 36, textAlign: "right", fontWeight: "600", paddingHorizontal: 10 },
  inputReadOnly: { backgroundColor: colors.canvas, color: colors.textSecondary },
  inputFocused: { borderColor: colors.primary },
});
