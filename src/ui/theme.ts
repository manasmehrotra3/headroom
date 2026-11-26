/**
 * Material 3 Expressive (Compose M3 1.5.0) — Material You Ocean theme tokens, in a dark and a
 * light scheme.
 *
 * Hierarchy comes from 5-step tonal surface containers (`surfaceLowest` -> `surfaceHighest`)
 * paired with expressive shape scales and semantic container color roles (`primary`, `secondary`,
 * `tertiary`, `success`, `warning`, `error`). Legacy token aliases (`surfaceRaised`, `accent`,
 * `text`, `textDim`, etc.) stay mapped here so every screen in the app inherits the Ocean palette.
 *
 * `colors`, `gradient` and `elevation` are live objects: switching the theme swaps their values in
 * place, so screens keep importing them exactly as before. Styles declared at module level must go
 * through `themedStyles` instead of `StyleSheet.create` so they are rebuilt after a switch.
 */
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

/** What the user picked in Settings. `system` follows the phone. */
export type ThemeMode = 'system' | 'light' | 'dark';
/** The scheme actually being painted. */
export type ColorScheme = 'light' | 'dark';

const darkColors = {
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

  /** Dimming behind a modal or bottom sheet. */
  scrim: 'rgba(0, 0, 0, 0.6)',
  /** Inset pill or chip sitting on top of a filled tonal container. */
  scrimSoft: 'rgba(0, 0, 0, 0.24)',
  /** Progress track drawn on top of a filled tonal container. */
  trackOnContainer: 'rgba(255, 255, 255, 0.16)',
};

/** Every scheme carries exactly these tokens. */
type Palette = typeof darkColors;

const lightColors: Palette = {
  // Core canvas & 5-step M3 tonal surface hierarchy (light goes darker as it stacks)
  background: '#F7F9FC',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F1F4F9',
  surface: '#EBEFF5',
  surfaceRaised: '#E4E9F0',
  surfaceHigh: '#E4E9F0',
  surfaceHighest: '#DDE3EB',
  sheet: '#F1F4F9',
  /** White pill + shadow reads as the floating toolbar in light. */
  toolbar: '#FFFFFF',

  // Outlines & subtle separators
  outline: '#72777F',
  outlineVariant: '#C2C7CF',
  border: 'rgba(0, 77, 122, 0.12)',

  // Typography colors
  text: '#191C20',
  onSurface: '#191C20',
  textDim: '#43474E',
  onSurfaceVariant: '#43474E',

  // Primary — Material You Ocean Blue, tone 40
  primary: '#00629D',
  onPrimary: '#FFFFFF',
  primaryContainer: '#CFE5FF',
  onPrimaryContainer: '#001D34',

  accent: '#00629D',
  accentText: '#FFFFFF',
  accentSoft: '#CFE5FF',
  accentDim: '#2C7CB5',

  // Secondary — Cool Slate Blue-Grey
  secondary: '#51606F',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D5E4F7',
  onSecondaryContainer: '#0E1D2A',

  // Tertiary — Soft Lilac
  tertiary: '#67548B',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#EBDDFF',
  onTertiaryContainer: '#230F46',
  info: '#67548B',

  // Semantic status roles
  success: '#0F6B40',
  successContainer: '#A6F2C6',
  onSuccessContainer: '#002111',

  warning: '#7A5900',
  warningSoft: '#FFDF9E',
  warningContainer: '#FFDF9E',
  onWarningContainer: '#261A00',

  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  scrim: 'rgba(0, 0, 0, 0.32)',
  scrimSoft: 'rgba(0, 0, 0, 0.12)',
  trackOnContainer: 'rgba(0, 0, 0, 0.12)',
};

/** Soft Material You Ocean tonal wash at the top of each screen. */
const darkGradient = {
  top: '#182A3B',
  middle: '#131C26',
  bottom: '#101418',
  glow: '#1E3C56',
  heightFraction: 0.45,
};

type Gradient = typeof darkGradient;

const lightGradient: Gradient = {
  top: '#DCE9F7',
  middle: '#EDF2F9',
  bottom: '#F7F9FC',
  glow: '#C6DEF5',
  heightFraction: 0.45,
};

/** Shadows have to be much softer on a light canvas to read as elevation rather than dirt. */
const darkElevation = { shadowOpacity: 0.45 };
const lightElevation: typeof darkElevation = { shadowOpacity: 0.16 };

/** Live palette. Values are swapped in place by `setColorScheme`; never reassign the object. */
export const colors: Palette = { ...darkColors };
export const gradient: Gradient = { ...darkGradient };
export const elevation = { ...darkElevation };

let scheme: ColorScheme = 'dark';
/** Bumped on every switch, so themed stylesheets know to rebuild. */
let version = 0;

/** The scheme currently painted. */
export function colorScheme(): ColorScheme {
  return scheme;
}

/** Swaps the palette in place. Callers must re-render (or remount) for the new colors to show. */
export function setColorScheme(next: ColorScheme): void {
  if (next === scheme) return;
  scheme = next;
  Object.assign(colors, next === 'light' ? lightColors : darkColors);
  Object.assign(gradient, next === 'light' ? lightGradient : darkGradient);
  Object.assign(elevation, next === 'light' ? lightElevation : darkElevation);
  version += 1;
}

/**
 * `StyleSheet.create` for styles that read the palette. The factory re-runs after a theme switch,
 * so `styles.foo` always hands back colors from the current scheme. Lazy: nothing is built until a
 * style is first read.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function themedStyles<T extends NamedStyles<T> | NamedStyles<any>>(factory: () => T & NamedStyles<any>): T {
  let built: T | undefined;
  let builtAt = -1;
  const build = (): T => {
    if (builtAt !== version) {
      built = StyleSheet.create(factory());
      builtAt = version;
    }
    return built as T;
  };
  return new Proxy({} as T, {
    get: (_target, key) => build()[key as keyof T],
    has: (_target, key) => key in build(),
    ownKeys: () => Reflect.ownKeys(build()),
    getOwnPropertyDescriptor: (_target, key) => Reflect.getOwnPropertyDescriptor(build(), key),
  });
}

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
