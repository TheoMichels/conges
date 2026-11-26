import type { ViewStyle } from "react-native";

// Refonte visuelle ITS4U : fond blanc net, cartes à bordure fine, bleu ITS4U pour
// l'identité, orange ITS4U pour les CTA et l'état actif.

// Fond d'écran uni (structure à 4 teintes conservée pour LinearGradient).
export const gradient = {
  colors: ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"] as const,
  locations: [0, 0.35, 0.7, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

// Dégradé bleu ITS4U des avatars et pastilles KPI.
export const brandGradient = {
  colors: ["#1F4E79", "#2F80C0"] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

// Segoe UI est la police du template ; repli sur la police système ailleurs.
export const fonts = {
  base: '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

export const colors = {
  // Brand & DA
  brand: "#1B2B3A",
  brandMuted: "#4B5B6B",
  primary: "#1F4E79",
  primaryLight: "#2F80C0",
  primarySoft: "#EAF1F8",
  primaryBorder: "#BFD3E6",
  primaryBackground: "#F8F9FB",

  // CTA & état actif
  cta: "#EE6A24",
  ctaSoft: "#FEF0E7",
  ctaText: "#C2541A",

  // Typographie
  textPrimary: "#1B2B3A",
  textSecondary: "#6B7280",
  textMuted: "#6B7280",
  textBody: "#374151",
  textOnBrand: "#FFFFFF",

  // Surfaces
  panel: "#FFFFFF",
  panelSubtle: "#F8F9FB",
  surface: "#FFFFFF",
  surfaceActive: "#F8F9FB",

  accentSurface: "#EAF1F8",
  selection: "#EAF1F8",
  background: "#FFFFFF",

  // Bordures & séparateurs
  border: "#E6E8EE",
  borderStrong: "#D5D9E2",
  borderDashed: "#C9CDD8",
  divider: "#EEF0F4",

  // États sémantiques
  warning: "#A16207",
  warningSoft: "#FEF5E2",
  danger: "#DC2626",
  dangerSoft: "#FDECEC",
  positive: "#15803D",
  positiveSoft: "#E9F9EF",
  statusOk: "#22C55E",

  // Overlays
  backdrop: "rgba(27, 43, 58, 0.40)",

  // Alias rétrocompatibles
  accent: "#1F4E79",
  accentSoft: "#2F80C0",
  sidebar: "#FFFFFF",
};

// Tags pastel pour les durées de congés.
export const tagPalette = [
  { background: "#FEF0E7", text: "#C2541A" },
  { background: "#E7F0FF", text: "#1D4ED8" },
  { background: "#FEF5E2", text: "#A16207" },
  { background: "#FDECF1", text: "#BE123C" },
] as const;

const isNativeRuntime =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

// Plus de verre dépoli : surfaces opaques. Export conservé pour compatibilité.
export const glassStyle: ViewStyle = {};

export const pearlBackground: ViewStyle = { backgroundColor: colors.background };

// Liseré orange à gauche de l'élément sélectionné (web uniquement).
export const selectedInset: ViewStyle = isNativeRuntime
  ? { borderLeftWidth: 3, borderLeftColor: colors.cta }
  : ({ boxShadow: `inset 3px 0 0 ${colors.cta}` } as unknown as ViewStyle);

// Halo autour du point de statut des KPI (web uniquement).
export const statusHalo = (color: string): ViewStyle =>
  isNativeRuntime ? {} : ({ boxShadow: `0 0 0 4px ${color}` } as unknown as ViewStyle);

export const shadows = {
  sm: {
    shadowColor: "#141E3C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#141E3C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  lg: {
    shadowColor: "#141E3C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

// Rayons spécifiques à la refonte (cartes 18, lignes 14, pastilles 999).
export const shape = {
  row: 14,
  card: 18,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
