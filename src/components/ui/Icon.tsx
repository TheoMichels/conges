import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/colors";

// Jeu d'icônes à trait (style Lucide) : remplace les caractères Unicode (✓ ✕ ⌄ ☑ ← →).
const PATHS = {
  home: ["M3.5 10.5 12 3.5l8.5 7", "M5.5 9v11h13V9"],
  users: [
    "M5.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0",
    "M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5",
    "M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .6 3.2 2.4 3.5 5.2",
  ],
  shield: ["M12 2.8 4.5 5.6v6c0 4.7 3.2 8.2 7.5 9.6 4.3-1.4 7.5-4.9 7.5-9.6v-6z", "m9 12 2 2 4-4"],
  user: ["M8 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M4 21c.8-4 4-6 8-6s7.2 2 8 6"],
  left: ["m15 6-6 6 6 6"],
  right: ["m9 6 6 6-6 6"],
  down: ["m6 9 6 6 6-6"],
  plus: ["M12 5v14M5 12h14"],
  edit: ["m16 3 5 5M4 20l4-1L21 6a2.12 2.12 0 0 0-3-3L5 16l-1 4Z"],
  trash: ["M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"],
  info: ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M12 11v6M12 7.5v.5"],
  search: ["M4 11a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "m20 20-3.5-3.5"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  reset: ["M3.5 12a8.5 8.5 0 1 0 2.6-6.1", "M3.5 3.5v5h5"],
  x: ["M6 6l12 12M18 6 6 18"],
  alert: ["M12 3.5 2.5 20h19z", "M12 10v4.5M12 17.2v.3"],
  archive: [
    "M4.5 4h15A1.5 1.5 0 0 1 21 5.5v2A1.5 1.5 0 0 1 19.5 9h-15A1.5 1.5 0 0 1 3 7.5v-2A1.5 1.5 0 0 1 4.5 4z",
    "M5 9v11h14V9M10 13h4",
  ],
  arrow: ["M5 12h14M13 6l6 6-6 6"],
  logout: ["M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"],
  calendar: [
    "M5.5 4.5h13A2.5 2.5 0 0 1 21 7v11.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5V7a2.5 2.5 0 0 1 2.5-2.5z",
    "M8 2.5v4M16 2.5v4M3 10h18",
  ],
  cloud: ["M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 10z"],
  device: ["M4 5h16v11H4z", "M8 20h8M12 16v4"],
} as const;

export type IconName = keyof typeof PATHS;

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 16, color = colors.textSecondary, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {PATHS[name].map((d) => <Path key={d} d={d} />)}
    </Svg>
  );
}
