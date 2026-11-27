import { ReactNode } from "react";
import { Pressable, PressableStateCallbackType, StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from "react-native";
import { colors, fonts, shape, webOnly } from "../../theme/colors";
import { cursorPointer } from "../../theme/webCursor";
import { Icon, IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type Props = {
  label?: string;
  icon?: IconName;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
};

type WebState = PressableStateCallbackType & { hovered?: boolean };

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: colors.textOnBrand,
  secondary: colors.textPrimary,
  ghost: colors.textSecondary,
  danger: colors.danger,
};

// Bouton unique de la refonte v2 : remplace les définitions locales de chaque écran.
export function Button({ label, icon, variant = "secondary", size = "md", onPress, disabled, testID, accessibilityLabel, style, textStyle, children }: Props) {
  const iconOnly = !label && !children && !!icon;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={(state: WebState) => [
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        iconOnly && (size === "sm" ? styles.iconSm : styles.iconMd),
        styles[variant],
        state.hovered && !disabled && hoverStyles[variant],
        state.pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        cursorPointer,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 16} color={TEXT_COLOR[variant]} /> : null}
      {label ? <Text style={[styles.text, size === "sm" && styles.textSm, { color: TEXT_COLOR[variant] }, textStyle]}>{label}</Text> : null}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: shape.control,
    borderWidth: 1,
    alignSelf: "flex-start",
    ...webOnly({ transitionProperty: "background-color, border-color", transitionDuration: "120ms" }),
  },
  md: { minHeight: 44, paddingHorizontal: 16 },
  sm: { minHeight: 36, paddingHorizontal: 12, borderRadius: 8 },
  iconMd: { width: 44, paddingHorizontal: 0 },
  iconSm: { width: 36, paddingHorizontal: 0 },
  primary: { backgroundColor: colors.cta, borderColor: colors.cta },
  secondary: { backgroundColor: colors.panel, borderColor: colors.border },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  danger: { backgroundColor: "transparent", borderColor: "transparent" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  text: { fontFamily: fonts.base, fontSize: 14, fontWeight: "600" },
  textSm: { fontSize: 13 },
});

const hoverStyles = StyleSheet.create({
  primary: { backgroundColor: "#E05F1B", borderColor: "#E05F1B" },
  secondary: { backgroundColor: "#FCFCFD", borderColor: colors.borderStrong },
  ghost: { backgroundColor: colors.canvas },
  danger: { backgroundColor: colors.dangerSoft },
});
