/**
 * Material 3 Expressive (Compose M3 1.5.0) — Material You Ocean Dark theme tokens.
 *
 * Hierarchy comes from 5-step tonal surface containers (`surfaceLowest` -> `surfaceHighest`)
 * paired with expressive shape scales and semantic container color roles (`primary`, `secondary`,
 * `tertiary`, `success`, `warning`, `error`). Legacy token aliases (`surfaceRaised`, `accent`,
 * `text`, `textDim`, etc.) stay mapped here so every screen in the app inherits the Ocean palette.
 */
export const colors = {
  // Core canvas & 5-step M3 tonal surface hierarchy
  background: '#101418',
  surfaceLowest: '#0B0E12',
  surfaceLow: '#171C22',
  /** M3 surfaceContainer — default card & list tile fill. */
  surface: '#1D232A',
  /** M3 surfaceContainerHigh — elevated cards, toolbar, active press fills. */
  surfaceRaised: '#272E36',
  surfaceHigh: '#272E36',
  /** M3 surfaceContainerHighest — tracks, icon wells, subtle pill buttons. */
  surfaceHighest: '#323A43',
  /** Opaque modal & bottom sheet surface. */
  sheet: '#171C22',
  /** Elevated Floating Toolbar pill surface. */
  toolbar: '#232B34',

  // Outlines & subtle separators
  outline: '#8A94A0',
  outlineVariant: '#3E4854',
  border: 'rgba(144, 205, 255, 0.10)',

  // Typography colors
  text: '#E1E7EF',
  onSurface: '#E1E7EF',
  textDim: '#BAC4D0',
  onSurfaceVariant: '#BAC4D0',

  // Primary — Material You Ocean Blue
  primary: '#90CDFF',
  onPrimary: '#00344F',
  primaryContainer: '#004B70',
  onPrimaryContainer: '#CBE6FF',

  // Legacy accent aliases mapped to Material You Ocean Primary
  accent: '#90CDFF',
  accentText: '#00344F',
  accentSoft: '#004B70',
  accentDim: '#4DA3E0',

  // Secondary — Cool Slate Blue-Grey
  secondary: '#B8C8D8',
  onSecondary: '#223240',
  secondaryContainer: '#394857',
  onSecondaryContainer: '#D2E4F7',

  // Tertiary — Soft Lilac (protein, sleep, race plans, rest timer)
  tertiary: '#D6BEE5',
  onTertiary: '#3A2947',
  tertiaryContainer: '#523F60',
  onTertiaryContainer: '#F2DAFF',
  info: '#D6BEE5',

  // Semantic status roles
  success: '#7ADFA0',
  successContainer: '#14492E',
  onSuccessContainer: '#BDF8CE',

  warning: '#F4C96B',
  warningSoft: '#4A380B',
  warningContainer: '#4A380B',
  onWarningContainer: '#FFE099',

  danger: '#FFB4AB',
  dangerSoft: '#690005',
  error: '#FFB4AB',
  errorContainer: '#690005',
  onErrorContainer: '#FFDAD6',
} as const;

/** Soft Material You Ocean tonal wash at the top of each screen. */
export const gradient = {
  top: '#182A3B',
  middle: '#131C26',
  bottom: '#101418',
  glow: '#1E3C56',
  heightFraction: 0.45,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Material 3 Expressive corner radii. */
export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
} as const;

/** Expressive typography scale (paired with tabular numerals for metrics). */
export const font = {
  caption: 11,
  small: 13,
  body: 15,
  large: 18,
  title: 24,
  display: 32,
  hero: 36,
} as const;

/** Minimum height for anything tappable: usable with sweaty hands, one-handed. */
export const TAP_MIN = 56;
