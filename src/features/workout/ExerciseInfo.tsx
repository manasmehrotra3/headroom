import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import youtube from '@/data/youtube.json';
import type { Exercise } from '@/domain/strength/types';
import { colors, font, radius, space, themedStyles } from '@/ui/theme';

import { ExerciseFrames } from './ExerciseFrames';

const YOUTUBE: Record<string, string> = youtube;

/** Frames, station, setup, cues and mistakes. `compact` collapses the text behind a toggle for the player. */
export function ExerciseInfo({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const videoId = YOUTUBE[exercise.id];

  return (
    <View>
      <ExerciseFrames image={exercise.image} height={compact ? 200 : 260} />
      <Text style={styles.station}>{exercise.station}</Text>

      {compact ? (
        <Pressable onPress={() => setOpen((o) => !o)} style={styles.toggle}>
          <Text style={styles.toggleText}>{open ? 'Hide setup & cues ▲' : 'Setup & cues ▼'}</Text>
        </Pressable>
      ) : null}

      {open ? (
        <View style={styles.details}>
          <Text style={styles.label}>SETUP</Text>
          <Text style={styles.body}>{exercise.setup}</Text>
          <Text style={styles.label}>CUES</Text>
          {exercise.cues.map((cue) => (
            <Text key={cue} style={styles.body}>
              • {cue}
            </Text>
          ))}
          <Text style={styles.label}>COMMON MISTAKES</Text>
          {exercise.mistakes.map((m) => (
            <Text key={m} style={[styles.body, { color: colors.warning }]}>
              ✕ {m}
            </Text>
          ))}
          <Text style={styles.label}>MUSCLES</Text>
          <Text style={styles.body}>{exercise.muscles.join(', ')}</Text>
        </View>
      ) : null}

      {videoId ? (
        <Pressable onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)} style={styles.video}>
          <Text style={styles.videoText}>▶ Watch on YouTube</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  station: { color: colors.textDim, fontSize: font.small, marginTop: space.sm },
  toggle: { paddingVertical: space.sm },
  toggleText: { color: colors.info, fontSize: font.body },
  details: { marginTop: space.xs },
  label: { color: colors.textDim, fontSize: font.small, fontWeight: '600', letterSpacing: 0.8, marginTop: space.md, marginBottom: space.xs },
  body: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  video: { marginTop: space.md, alignSelf: 'flex-start', paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  videoText: { color: colors.info, fontSize: font.body },
}));
