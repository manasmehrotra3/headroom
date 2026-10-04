import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, font } from './theme';

/** Circular progress: value vs target, with the number in the middle. Over-target turns amber. */
export function Ring({ value, target, label, unit, size = 120, color = colors.accent }: { value: number; target: number; label: string; unit: string; size?: number; color?: string }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target * 1.05;
  return (
    <View style={{ alignItems: 'center', width: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={over ? colors.warning : color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: font.large, fontWeight: '700' }}>{Math.round(value)}</Text>
        <Text style={{ color: colors.textDim, fontSize: 11 }}>
          / {Math.round(target)} {unit}
        </Text>
      </View>
      <Text style={{ color: colors.textDim, fontSize: font.small, marginTop: 4 }}>{label}</Text>
    </View>
  );
}
