import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme/colors";

type Props = {
  label: string;
  hint?: string;
  readOnly?: boolean;
  value: number;
  onChange: (value: number) => void;
};

function formatNumber(n: number): string {
  return n === 0 ? "0" : String(n);
}

function parseNumber(raw: string): number {
  const parsed = parseFloat(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function NumberField({ label, hint, value, onChange, readOnly = false }: Props) {
  const [text, setText] = useState(() => formatNumber(value));
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
    setText(formatNumber(lastPropagated.current));
  };

  return (
    <View style={styles.field}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        style={[styles.input, readOnly && styles.inputReadOnly]}
        editable={!readOnly}
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minWidth: 140,
    flex: 1,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: "hidden",
  },
  input: {
    fontFamily: fonts.base,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 46,
  },
  inputReadOnly: {
    backgroundColor: colors.panelSubtle,
  },
});
