/**
 * Dark theme tokens. Everything visual pulls from here.
 *
 * The look: a dusky gradient glowing behind the top of every screen (slate blue into plum into
 * near-black), with cards that are translucent so the glow shows through them. Anything that
 * floats over other content — bottom sheets, the tab bar — uses the opaque `sheet` colour
 * instead, or the content underneath would bleed through.
 */
export const colors = {
  background: '#0B0A10',
  /** Cards and rows: translucent, so the backdrop gradient reads through. */
  surface: 'rgba(255,255,255,0.055)',
  surfaceRaised: 'rgba(255,255,255,0.095)',
  /** Opaque, for bottom sheets and anything else layered over content. */
  sheet: '#17151E',
  border: 'rgba(255,255,255,0.08)',
  text: '#F4F3F7',
  textDim: '#A09DAB',
  accent: '#4ADE80',
  accentText: '#06260F',
  /** Soft tint behind accent-coloured chips and the active tab. */
  accentSoft: 'rgba(74,222,128,0.16)',
  /** Quieter green for filled controls, the same as the shorter bars in the app icon. */
  accentDim: '#3C9A69',
  info: '#60A5FA',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.14)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
} as const;

/** The backdrop behind every screen, top to bottom. See GradientBackdrop. */
export const gradient = {
  top: '#3A4556',
  middle: '#2C2433',
  bottom: '#0B0A10',
  /** A warm glow off to one side, like light across the top of a phone. */
  glow: '#5B4148',
  /** How far down the screen the gradient reaches before it is plain background. */
  heightFraction: 0.62,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 24, xl: 30, pill: 999 } as const;

export const font = {
  small: 13,
  body: 16,
  large: 19,
  title: 24,
  hero: 34,
} as const;

/** Minimum height for anything tappable: usable with sweaty hands, one-handed. */
export const TAP_MIN = 56;
