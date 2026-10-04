import { eq } from 'drizzle-orm';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { db } from '@/db/client';
import { loadSettings } from '@/db/repos/profileRepo';
import { rebuildFromToday } from '@/db/repos/planRepo';
import { deleteRace, listRaces, saveRace } from '@/db/repos/raceRepo';
import { settings } from '@/db/schema';
import { addDays, daysBetween, todayKey } from '@/domain/dates';
import { RACE_TYPES, RACE_TYPE_IDS, racePhase, PHASE_LABELS, type Race, type RaceType } from '@/domain/plan/race';
import { Body, Button, Card, Chips, Field, Screen, SectionLabel, Stepper, Title } from '@/ui/components';
import { DurationField } from '@/ui/fields';
import { formatShortDate } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

const TYPE_OPTIONS = RACE_TYPE_IDS.map((id) => ({ id, label: RACE_TYPES[id].label }));
const PRIORITY = [
  { id: 'A', label: 'A race (plan around it)' },
  { id: 'B', label: 'B race (train through it)' },
] as const;
const TEMPLATE = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
] as const;

const emptyRace = (): Race => ({ name: '', type: 'half_marathon', date: addDays(todayKey(), 7 * 12), priority: 'A', goalTimeSec: null });

/** Add the races you're training for. The next A race drives the plan's phase and long sessions. */
export default function RacesScreen() {
  const today = todayKey();
  const [races, setRaces] = useState(listRaces);
  const [draft, setDraft] = useState<Race | null>(null);
  const [useTemplate, setUseTemplate] = useState(() => loadSettings().useRaceTemplate);

  const refresh = () => setRaces(listRaces());

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      Alert.alert('Name it', 'Give the race a name so you know which one it is.');
      return;
    }
    saveRace({ ...draft, name: draft.name.trim() });
    // The stored week was built from the old template, so re-plan the days still to come.
    rebuildFromToday();
    setDraft(null);
    refresh();
  };

  const confirmDelete = (race: Race) =>
    Alert.alert(`Remove ${race.name}?`, 'The plan goes back to your normal weekly template.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (race.id) deleteRace(race.id);
          rebuildFromToday();
          refresh();
        },
      },
    ]);

  const weeksAway = draft ? Math.max(1, Math.round(daysBetween(today, draft.date) / 7)) : 12;

  return (
    <>
      <Stack.Screen options={{ title: 'Races' }} />
      <Screen edges={['bottom']}>
        <Title subtitle="The next A race sets the training phase, the long ride and the long run.">Races</Title>

        {races.map((race) => {
          const weeks = daysBetween(today, race.date) / 7;
          const phase = racePhase(weeks, race.type);
          const past = weeks < 0;
          return (
            <Card key={race.id} style={past ? { opacity: 0.6 } : undefined}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.name}>{race.name}</Text>
                <Text style={styles.badge}>{race.priority}</Text>
              </View>
              <Body dim>
                {RACE_TYPES[race.type].label} · {formatShortDate(race.date)}
                {past ? ' · done' : ` · ${Math.floor(weeks)} weeks away · ${PHASE_LABELS[phase]}`}
              </Body>
              {race.goalTimeSec ? <Body dim>Goal {Math.floor(race.goalTimeSec / 3600)}h{String(Math.floor((race.goalTimeSec % 3600) / 60)).padStart(2, '0')}</Body> : null}
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button variant="secondary" label="Edit" onPress={() => setDraft(race)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button variant="danger" label="Remove" onPress={() => confirmDelete(race)} />
                </View>
              </View>
            </Card>
          );
        })}
        {races.length === 0 ? <Body dim>No races yet. Add one and the plan starts building toward it.</Body> : null}

        {draft ? (
          <>
            <SectionLabel>{draft.id ? 'Edit race' : 'New race'}</SectionLabel>
            <Field label="Name" placeholder="e.g. Boulder 70.3" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />

            <SectionLabel>Distance</SectionLabel>
            <Chips options={TYPE_OPTIONS} selected={[draft.type]} onToggle={(type: RaceType) => setDraft({ ...draft, type })} />

            <SectionLabel>When</SectionLabel>
            <Stepper
              label="Weeks from today"
              value={weeksAway}
              step={1}
              min={1}
              max={104}
              format={(v) => `${v} weeks · ${formatShortDate(addDays(today, v * 7))}`}
              onChange={(weeks) => setDraft({ ...draft, date: addDays(today, weeks * 7) })}
            />
            <Field
              label="Or type the exact date (YYYY-MM-DD)"
              value={draft.date}
              onChangeText={(date) => setDraft({ ...draft, date })}
              placeholder="2027-06-12"
            />

            <SectionLabel>Priority</SectionLabel>
            <Chips options={PRIORITY} selected={[draft.priority]} onToggle={(priority) => setDraft({ ...draft, priority })} />

            <SectionLabel>Goal time (optional)</SectionLabel>
            <DurationField label="h:mm:ss or mm:ss" value={draft.goalTimeSec} onChange={(goalTimeSec) => setDraft({ ...draft, goalTimeSec })} />

            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              <View style={{ flex: 1 }}>
                <Button label="Save race" onPress={save} />
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" label="Cancel" onPress={() => setDraft(null)} />
              </View>
            </View>
          </>
        ) : (
          <Button label="Add a race" onPress={() => setDraft(emptyRace())} />
        )}

        <SectionLabel>Let the race reshape my week</SectionLabel>
        <Chips
          options={TEMPLATE}
          selected={[useTemplate ? 'yes' : 'no']}
          onToggle={(id) => {
            const next = id === 'yes';
            setUseTemplate(next);
            db.update(settings).set({ useRaceTemplate: next }).where(eq(settings.id, 1)).run();
            rebuildFromToday();
          }}
        />
        <Body dim>
          {'\n'}On: a triathlon swaps Tuesday and Saturday to bike days and Saturday becomes the long ride with a brick run; a running race
          turns the weekend easy run into a long run. Off: your own weekly schedule is used exactly as you set it.
        </Body>
        <View style={{ height: space.md }} />
        <Button variant="secondary" label="See the race plan" onPress={() => router.push('/insights/race')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: font.large, fontWeight: '600', flexShrink: 1 },
  badge: { color: colors.accent, fontSize: font.body, fontWeight: '700' },
});
