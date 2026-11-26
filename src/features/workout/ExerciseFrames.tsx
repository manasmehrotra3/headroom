import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { EXERCISE_IMAGES } from '@/data/exerciseImages';
import { colors, radius, themedStyles } from '@/ui/theme';

/** Loops the two bundled frames (start / end position) so the movement reads as an animation. */
export function ExerciseFrames({ image, height = 220 }: { image: string; height?: number }) {
  const frames = EXERCISE_IMAGES[image];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!frames) return;
    const timer = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 900);
    return () => clearInterval(timer);
  }, [frames]);

  if (!frames) return <View style={[styles.box, { height }]} />;

  return (
    <View style={[styles.box, { height }]}>
      {/* Both frames stay mounted so switching never flickers. */}
      <Image source={frames[0]} style={[styles.image, { opacity: frame === 0 ? 1 : 0 }]} resizeMode="contain" />
      <Image source={frames[1]} style={[styles.image, { opacity: frame === 1 ? 1 : 0 }]} resizeMode="contain" />
    </View>
  );
}

const styles = themedStyles(() => ({
  box: { width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#F4F4F4' },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: colors.surface },
}));
