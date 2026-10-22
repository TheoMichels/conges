import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

type Props = { name: "edit" | "delete" };

export function ActionIcon({ name }: Props) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={colors.textSecondary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      accessible={false}>
      {name === "edit" ? (
        <Path d="m16 3 5 5M4 20l4-1L21 6a2.12 2.12 0 0 0-3-3L5 16l-1 4Z" />
      ) : (
        <Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      )}
    </Svg>
  );
}
