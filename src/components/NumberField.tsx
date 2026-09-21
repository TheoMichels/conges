import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "../theme/colors";

type Props = {
  label: string;
  hint?: string;
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

export function NumberField({ label, hint, value, onChange }: Props) {
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
        style={styles.input}
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
    width: 160,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.base,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.base,
    fontSize: 11,
    fontWeight: "500",
    color: colors.brandMuted,
    backgroundColor: "#EDF2F5",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  input: {
    fontFamily: fonts.base,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
