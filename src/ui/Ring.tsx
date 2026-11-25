/**
 * Material 3 Expressive circular wavy progress gauge.
 * Preserves the `<Ring />` API while upgrading to animated scalloped wavy strokes.
 */
import { WavyCircularProgress } from './expressive';
import { colors } from './theme';

export function Ring({
  value,
  target,
  label,
  unit,
  size = 128,
  color = colors.primary,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  size?: number;
  color?: string;
}) {
  return (
    <WavyCircularProgress
      value={value}
      target={target}
      label={label}
      unit={unit}
      size={size}
      color={color}
      trackColor={colors.surfaceHighest}
      overColor={colors.warning}
    />
  );
}
