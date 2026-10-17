// Charte ITS4U : pétrole profond #072939 et orange #E85315,
// sur des surfaces majoritairement blanches translucides ("glass").

export const gradient = {
  colors: ["#FFFFFF", "#F7FAFC", "#EEF4F8", "#E5EEF5"] as const,
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
  brand: "#072939",
  brandMuted: "#1D4E60",
  primary: "#E85315",
  primaryLight: "#FBAE40",
  primarySoft: "rgba(232, 83, 21, 0.12)",
  primaryBackground: "#FFF8F5",

  // Typographie
  textPrimary: "#072939",
  textSecondary: "#50646F",
  textMuted: "#8B99A3",
  textOnBrand: "#FFFFFF",

  // Glassmorphism & surfaces
  panel: "rgba(255, 255, 255, 0.85)",
  panelSubtle: "rgba(255, 255, 255, 0.60)",
  surface: "rgba(245, 248, 250, 0.90)",
  surfaceActive: "#FFFFFF",

  // Bordures & séparateurs
  border: "#E3EAEF",
  borderStrong: "#CCD9E0",
  divider: "#EBF0F3",

  // États sémantiques
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  danger: "#C0392B",
  dangerSoft: "#FDE8E8",
  positive: "#1F7A5C",
  positiveSoft: "#E6F4EA",

  // Overlays
  backdrop: "rgba(7, 41, 57, 0.40)",

  // Alias rétrocompatibles
  accent: "#E85315",
  accentSoft: "#FBAE40",
  sidebar: "rgba(255, 255, 255, 0.85)",
};

export const shadows = {
  sm: {
    shadowColor: "#072939",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#072939",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: "#072939",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
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
