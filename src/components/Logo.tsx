import { Image, StyleSheet } from "react-native";

type Props = {
  size?: number;
};

// Icône 3D Holidays : chevrons ITS4U en voilier sur mer au coucher de soleil, rendu squircle
export function Logo({ size = 32 }: Props) {
  const borderRadius = Math.round(size * 0.2237);
  return (
    <Image
      testID="app-logo"
      source={require("../../assets/icon.png")}
      accessibilityRole="image"
      accessibilityLabel="Logo Holidays"
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    resizeMode: "cover",
    overflow: "hidden",
  },
});
