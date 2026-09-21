// Charte ITS4U (template "Support Comité de pilotage") : pétrole profond
// #072939 et orange #E85315, sur des surfaces majoritairement blanches.
export const gradient = {
  colors: ["#FFFFFF", "#F5F8FA", "#EDF2F5"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};

// Segoe UI est la police du template ; repli sur la police système ailleurs.
export const fonts = {
  base: '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
};

export const colors = {
  brand: "#072939",
  brandMuted: "#1D4E60",
  accent: "#E85315",
  accentSoft: "#FBAE40",

  textPrimary: "#072939",
  textSecondary: "#50646F",
  textMuted: "#8B99A3",
  textOnBrand: "#FFFFFF",

  panel: "#FFFFFF",
  sidebar: "#FFFFFF",
  surface: "#F5F8FA",
  border: "#E3EAEF",
  borderStrong: "#CCD9E0",

  danger: "#C0392B",
  positive: "#1F7A5C",
};
