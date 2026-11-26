import { Image } from "react-native";

type Props = {
  size?: number;
};

// Logo Holy page d'accueil : voilier 3D avec les deux chevrons ITS4U détourés sur fond transparent
export function Logo({ size = 36 }: Props) {
  return (
    <Image
      testID="app-logo"
      source={require("../../assets/home-boat-logo.png")}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Logo Holy"
      style={{ width: size, height: size }}
    />
  );
}
