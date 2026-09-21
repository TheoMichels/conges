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
        d="M62 26 L34 60 L62 94"
        fill="none"
        stroke={colors.brand}
        strokeWidth={15}
        strokeLinejoin="miter"
      />
      <Path
        d="M72 26 L100 60 L72 94"
        fill="none"
        stroke={colors.accent}
        strokeWidth={15}
        strokeLinejoin="miter"
      />
    </Svg>
  );
}
