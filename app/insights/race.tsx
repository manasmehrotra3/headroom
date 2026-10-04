import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { currentVdot } from '@/db/repos/planRepo';
import { currentRaceContext, longestSessions, recentRides } from '@/db/repos/raceRepo';
import { averageSpeedKmh } from '@/domain/cycling/workouts';
import { addDays, startOfWeek, todayKey } from '@/domain/dates';
import {
  estimateRaceTime,
  longSessionMin,
  PHASE_LABELS,
  PHASE_NOTES,
  RACE_TYPES,
  raceCountdown,
  raceReadiness,
  raceWeekSchedule,
} from '@/domain/plan/race';
import { SESSION_TYPES } from '@/domain/schedule';
import { WEEKDAYS, WEEKDAY_LABELS } from '@/domain/dates';
import { formatDuration } from '@/domain/units';
import { LineChartCard } from '@/ui/charts';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { colors, font, space } from '@/ui/theme';

/** The race dashboard: how far away, what phase, what's planned, and where the gaps are. */
export default function RaceScreen() {
  const today = todayKey();
  const [data] = useState(() => {
    const context = currentRaceContext(today);
    if (!context) return null;
    const spec = RACE_TYPES[context.race.type];
    const longest = longestSessions();
    const vdot = currentVdot();
    const bikeSpeed = averageSpeedKmh(recentRides());
    return {
      context,
      spec,
      longest,
      vdot,
      estimate: estimateRaceTime(context.race.type, { vdot, bikeSpeedKmh: bikeSpeed, swimPaceSecPer100m: null }),
      gaps: raceReadiness(context, longest),
      week: raceWeekSchedule(context.race.type),
      bikeSpeed,
    };
  });

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Race plan' }} />
        <Screen edges={['bottom']}>
          <Title>No race booked</Title>
          <Body dim>Add a race and the plan builds toward it: phases, a growing long ride and long run, and a taper.</Body>
          <View style={{ height: space.md }} />
          <Button label="Add a race" onPress={() => router.push('/edit/races')} />
        </Screen>
      </>
    );
  }

  const { context, spec, estimate, gaps, week } = data;
  // The long-session ramp from here to race day, a week at a time.
  const weeksLeft = Math.max(1, Math.ceil(context.weeks));
  const upcoming = Array.from({ length: Math.min(weeksLeft, 20) }, (_, i) => weeksLeft - i);
  const kind = spec.discipline === 'tri' ? 'bike' : 'run';
  const ramp = upcoming.map((w) => longSessionMin(kind, w, context.race.type));

  return (
    <>
      <Stack.Screen options={{ title: context.race.name }} />
      <Screen edges={['bottom']}>
        <Title subtitle={`${spec.label} · ${formatShortDate(context.race.date)}`}>{raceCountdown(context)}</Title>

        <Card style={{ borderColor: colors.info }}>
          <Text style={{ color: colors.text, fontSize: font.body, fontWeight: '600' }}>{PHASE_LABELS[context.phase]}</Text>
          <Body dim>{PHASE_NOTES[context.phase]}</Body>
        </Card>

        <SectionLabel>This week's endurance targets</SectionLabel>
        <Card>
          {context.longRideMin > 0 ? <Body>Long ride: {context.longRideMin} min{context.brickRunMin ? ` + ${context.brickRunMin} min brick run` : ''}</Body> : null}
          <Body>Long run: {context.longRunMin} min</Body>
          <Body dim>
            Weekdays stay under the 50-minute cap; the weekend long session gets its own allowance, growing toward{' '}
            {kind === 'bike' ? `${spec.peakLongRideMin} min on the bike` : `${spec.peakLongRunMin} min running`} at peak.
          </Body>
        </Card>

        {ramp.length > 1 ? (
          <>
            <SectionLabel>{kind === 'bike' ? 'Long ride' : 'Long run'} from here to race day</SectionLabel>
            <LineChartCard series={ramp} labels={upcoming.map((w) => `${w}w`)} formatY={(v) => `${Math.round(v)}m`} />
          </>
        ) : null}

        <SectionLabel>Predicted finish</SectionLabel>
        <Card>
          <Text style={{ color: colors.text, fontSize: font.title, fontWeight: '700' }}>{estimate.totalSec === null ? '—' : formatDuration(estimate.totalSec)}</Text>
          {estimate.splits.map((split) => (
            <View key={split.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textDim, fontSize: font.body }}>
                {split.label} <Text style={{ fontSize: font.small }}>({split.note})</Text>
              </Text>
              <Text style={{ color: colors.text, fontSize: font.body }}>{split.sec === null ? '—' : formatDuration(split.sec)}</Text>
            </View>
          ))}
          {context.race.goalTimeSec ? <Body dim>Your goal: {formatDuration(context.race.goalTimeSec)}</Body> : null}
          {estimate.caveats.map((c) => (
            <Body key={c} dim>
              • {c}
            </Body>
          ))}
        </Card>

        <SectionLabel>Are you ready?</SectionLabel>
        {gaps.map((gap) => (
          <Card key={gap.message} style={{ borderColor: gap.ok ? colors.accent : colors.warning }}>
            <Text style={{ color: gap.ok ? colors.accent : colors.warning, fontSize: font.body }}>
              {gap.ok ? '✓ ' : '! '}
              {gap.message}
            </Text>
          </Card>
        ))}

        <SectionLabel>The race week template</SectionLabel>
        <Card>
          {WEEKDAYS.map((day) => (
            <View key={day} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textDim, fontSize: font.body }}>{WEEKDAY_LABELS[day]}</Text>
              <Text style={{ color: colors.text, fontSize: font.body, flexShrink: 1, textAlign: 'right' }}>{SESSION_TYPES[week[day]].label}</Text>
            </View>
          ))}
          <Body dim>Turn this off in Settings → Races if you'd rather keep your own week.</Body>
        </Card>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="Edit races" onPress={() => router.push('/edit/races')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label="This week" onPress={() => router.push('/train')} />
          </View>
        </View>
        <Body dim>{`\nNext week starts ${formatShortDate(addDays(startOfWeek(today), 7))}.`}</Body>
      </Screen>
    </>
  );
}
