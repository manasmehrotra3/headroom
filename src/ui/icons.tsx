import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { color: ColorValue; size?: number };

function Icon({ color, size = 26, children }: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export const TodayIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={12} cy={12} r={4} />
    <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const TrainIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Icon>
);

export const FoodIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M3 12h18a9 9 0 0 1-18 0Z" />
    <Path d="M9 8c0-1.2 1-1.8 1-3M14 8c0-1.2 1-1.8 1-3" />
  </Icon>
);

export const ProgressIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M3 20h18M6 20v-8M12 20V5M18 20v-5" />
  </Icon>
);

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <Circle cx={15} cy={6} r={2} />
    <Circle cx={9} cy={12} r={2} />
    <Circle cx={17} cy={18} r={2} />
  </Icon>
);

/**
 * A cog outline built from points rather than a copied path: `teeth` square teeth between two
 * radii. Round line joins soften it into a friendly gear.
 */
function cogPath(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const points: string[] = [];
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const r = i % 4 < 2 ? outer : inner;
    const angle = (i / steps) * Math.PI * 2 - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

const COG = cogPath(12, 12, 9.5, 7.2, 8);

export const GearIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d={COG} />
    <Circle cx={12} cy={12} r={2.8} />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    <Path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
  </Icon>
);

export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={12} cy={12} r={9.5} />
    <Path d="M12 16.5v-5M12 7.8h.01" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
);

/** Lines getting shorter beside a down arrow: "sorted, soonest first". */
export const SortIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M11 6h9M11 12h6M11 18h3M5 4v16M2 17l3 3 3-3" />
  </Icon>
);

export const RunIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={15} cy={4.5} r={1.8} />
    <Path d="M6 21l3.5-5.5 3 2 1.5 4.5M9.5 15.5l2-5.5 3.5 2 3 1M7 11.5l3-2.5 3.5 1" />
  </Icon>
);

export const BikeIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={5.5} cy={17} r={3.5} />
    <Circle cx={18.5} cy={17} r={3.5} />
    <Path d="M5.5 17L9 9.5h6.5L18.5 17M9 9.5l3 7.5h-6.5M14 6h2.5l-1 3.5" />
  </Icon>
);

export const TennisIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={12} cy={12} r={9.5} />
    <Path d="M5.3 5.3c3.2 3.2 3.2 10.2 0 13.4M18.7 5.3c-3.2 3.2-3.2 10.2 0 13.4" />
  </Icon>
);

export const MobilityIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={12} cy={4.5} r={1.8} />
    <Path d="M4 10l8 1.5 8-1.5M12 11.5v4M8.5 21l3.5-5.5 3.5 5.5" />
  </Icon>
);

export const RestIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </Icon>
);

export const ScaleIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
    <Path d="M8.5 10a3.5 3.5 0 0 1 7 0M12 10l1.8-1.8" />
  </Icon>
);

export const HeartIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M20.8 8.7a4.9 4.9 0 0 0-8.8-3A4.9 4.9 0 0 0 3.2 8.7C3.2 14 12 20 12 20s8.8-6 8.8-11.3Z" />
  </Icon>
);

/** One icon per kind of session, for the week list and anywhere else a session is shown small. */
export const SESSION_KIND_ICONS = {
  strength: TrainIcon,
  run: RunIcon,
  bike: BikeIcon,
  tennis: TennisIcon,
  mobility: MobilityIcon,
  rest: RestIcon,
} as const;

export const WalkIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={13} cy={4.5} r={1.8} />
    <Path d="M8 21l2.5-6 2.5-1.5M13 13.5l.5-4.5 3 1.5 2 3M10 10l2.5-2 2 .5M13 13.5L15 21" />
  </Icon>
);

export const SwimIcon = (props: IconProps) => (
  <Icon {...props}>
    <Circle cx={16} cy={6.5} r={1.8} />
    <Path d="M4 11.5l4-2.5 3.5 2.5 3-1" />
    <Path d="M2 17.5c1.8 0 1.8-1.4 3.7-1.4s1.8 1.4 3.6 1.4 1.8-1.4 3.7-1.4 1.8 1.4 3.6 1.4 1.9-1.4 3.7-1.4M2 21c1.8 0 1.8-1.4 3.7-1.4S7.5 21 9.3 21s1.8-1.4 3.7-1.4S14.8 21 16.6 21s1.9-1.4 3.7-1.4" />
  </Icon>
);

/** One icon per kind of recorded activity, for the "done today" list. */
export const ACTIVITY_ICONS = {
  run: RunIcon,
  cycling: BikeIcon,
  tennis: TennisIcon,
  strength: TrainIcon,
  walk: WalkIcon,
  yoga: MobilityIcon,
  swim: SwimIcon,
  other: TodayIcon,
} as const;
