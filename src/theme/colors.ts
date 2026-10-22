import type { ViewStyle } from "react-native";

// Verre dépoli clair : perle, menthe et sauge ; vert forêt pour les CTA.

export const gradient = {
  colors: ["#F3F5F1", "#F0F4F3", "#EAF2EE", "#DCEBE5"] as const,
  locations: [0, 0.35, 0.7, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

// Segoe UI est la police du template ; repli sur la police système ailleurs.
export const fonts = {
  base: '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
};

export const colors = {
  // Brand & DA
  brand: "#14333E",
  brandMuted: "#45616A",
  primary: "#356859",
  primaryLight: "#8FA99C",
  primarySoft: "rgba(53, 104, 89, 0.12)",
  primaryBackground: "#F2F6F2",

  // Typographie
  textPrimary: "#14333E",
  textSecondary: "#63767D",
  textMuted: "#63767D",
  textOnBrand: "#FFFFFF",

  // Glassmorphism & surfaces
  panel: "rgba(255, 255, 255, 0.68)",
  panelSubtle: "rgba(255, 255, 255, 0.48)",
  surface: "rgba(255, 255, 255, 0.68)",
  surfaceActive: "rgba(255, 255, 255, 0.78)",

  accentSurface: "#E7EFEC",
  selection: "#DDE9E4",
  background: "#F0F4F3",

  // Bordures & séparateurs
  border: "rgba(20, 51, 62, 0.09)",
  borderStrong: "rgba(20, 51, 62, 0.16)",
  divider: "rgba(20, 51, 62, 0.06)",

  // États sémantiques
  warning: "#526B4F",
  warningSoft: "#E9F0E5",
  danger: "#C0392B",
  dangerSoft: "#FDE8E8",
  positive: "#1F7A5C",
  positiveSoft: "#E6F4EA",

  // Overlays
  backdrop: "rgba(20, 51, 62, 0.40)",

  // Alias rétrocompatibles
  accent: "#356859",
  accentSoft: "#8FA99C",
  sidebar: "rgba(255, 255, 255, 0.68)",
};

const isNativeRuntime =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

export const glassStyle: ViewStyle = isNativeRuntime
  ? {}
  : ({
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    } as unknown as ViewStyle);

export const pearlBackground: ViewStyle = isNativeRuntime ? {} : ({
  backgroundImage: "radial-gradient(ellipse at 94% 0%, #E4ECE5, transparent 52%), radial-gradient(ellipse at 5% 70%, #DCEBE5, transparent 60%)",
  backgroundColor: colors.background,
} as unknown as ViewStyle);

export const shadows = {
  sm: {
    shadowColor: "#14333E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#14333E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: "#14333E",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
