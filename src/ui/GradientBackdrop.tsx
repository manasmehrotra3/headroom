/**
 * The dusky gradient behind every screen: slate blue at the top, easing through plum into the
 * near-black background, with a warm glow off the top-right corner.
 *
 * Drawn with react-native-svg, which the app already uses for charts and icons, so there is no
 * extra gradient library. It sits behind the content and never takes touches.
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
          <LinearGradient id="backdropWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradient.top} />
            <Stop offset="0.42" stopColor={gradient.middle} />
            <Stop offset="1" stopColor={gradient.bottom} />
          </LinearGradient>
          <RadialGradient id="backdropGlow" cx="0.9" cy="0.08" rx="0.75" ry="0.42" fx="0.9" fy="0.08">
            <Stop offset="0" stopColor={gradient.glow} stopOpacity="0.6" />
            <Stop offset="1" stopColor={gradient.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={washHeight} fill="url(#backdropWash)" />
        <Rect x="0" y="0" width={width} height={washHeight} fill="url(#backdropGlow)" />
      </Svg>
    </View>
  );
}
