/**
 * Subtle Material You Ocean ambient tonal wash at the top of each screen.
 * Keeps the M3 surface hierarchy crisp while giving the top app bar gentle oceanic depth.
 */
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { gradient } from './theme';

export function GradientBackdrop() {
  const { width, height } = useWindowDimensions();
  const washHeight = Math.round(height * gradient.heightFraction);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={washHeight}>
        <Defs>
          <LinearGradient id="oceanWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradient.top} stopOpacity="0.85" />
            <Stop offset="0.52" stopColor={gradient.middle} stopOpacity="0.45" />
            <Stop offset="1" stopColor={gradient.bottom} stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="oceanGlow" cx="0.86" cy="0.06" rx="0.72" ry="0.45" fx="0.86" fy="0.06">
            <Stop offset="0" stopColor={gradient.glow} stopOpacity="0.42" />
            <Stop offset="1" stopColor={gradient.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={washHeight} fill="url(#oceanWash)" />
        <Rect x="0" y="0" width={width} height={washHeight} fill="url(#oceanGlow)" />
      </Svg>
    </View>
  );
}
