import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

type Props = {
  size?: number;
};

// Reprend le double chevron de la marque ITS4U : pétrole à gauche, orange à droite.
export function Logo({ size = 32 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path
        d="M55 26 L27 60 L55 94"
        fill="none"
        stroke={colors.brand}
        strokeWidth={15}
        strokeLinejoin="miter"
      />
      <Path
        d="M65 26 L93 60 L65 94"
        fill="none"
        stroke={colors.accent}
        strokeWidth={15}
        strokeLinejoin="miter"
      />
    </Svg>
  );
}
