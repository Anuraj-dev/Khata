// Design tokens for Khata — warm amber accent on deep dark background.
// Amounts are in paise internally; display layer handles ₹ formatting.

export const colors = {
  bg: "#0a0a0b",
  surface: "#111113",
  surfaceElevated: "#18181b",

  // Accent: warm amber — money feel
  accent: "#f59e0b",
  accentDim: "#92400e",
  accentSubtle: "#1c1508",

  // Semantic
  success: "#22c55e",
  successDim: "#14532d",
  warning: "#f59e0b",
  error: "#ef4444",
  errorDim: "#7f1d1d",
  credit: "#22c55e",
  debit: "#ef4444",

  // Text
  textPrimary: "#fafafa",
  textSecondary: "#a1a1aa",
  textMuted: "#52525b",
  textInverse: "#0a0a0b",

  // Borders
  borderSubtle: "#27272a",
  borderDefault: "#3f3f46",

  // Categories
  food: "#fb923c",
  travel: "#60a5fa",
  shopping: "#a78bfa",
  bills: "#f472b6",
  health: "#34d399",
  other: "#94a3b8",
} as const;

export const fonts = {
  sansRegular: "Geist_400Regular",
  sansMedium: "Geist_500Medium",
  sansSemibold: "Geist_600SemiBold",
  sansBold: "Geist_700Bold",
  monoMedium: "GeistMono_500Medium",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  rowY: 12,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: fonts.sansSemibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: fonts.sansSemibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyLg: {
    fontFamily: fonts.sansRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fonts.sansRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  micro: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  amount: {
    fontFamily: fonts.monoMedium,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  amountLg: {
    fontFamily: fonts.monoMedium,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1,
  },
} as const;

export const motion = {
  duration: {
    instant: 80,
    fast: 150,
    base: 220,
    slow: 350,
    deliberate: 500,
  },
  easing: {
    outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
    outQuart: [0.25, 1, 0.5, 1] as [number, number, number, number],
    inOutQuart: [0.76, 0, 0.24, 1] as [number, number, number, number],
  },
} as const;
