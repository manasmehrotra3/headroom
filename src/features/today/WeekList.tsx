/**
 * This week's sessions as a list: an icon tile per session, its name and day, and how long it
 * is. "Upcoming" hides what is behind you and rest days; "Whole week" shows all seven.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { type DateKey } from '@/domain/dates';
import type { PlannedSession } from '@/domain/plan/types';
import { SESSION_TYPES } from '@/domain/schedule';
import { ListGroup, ListRow, SectionHeader, type Tone } from '@/ui/cards';
import { Body, Card } from '@/ui/components';
import { formatShortDate } from '@/ui/format';
import { SESSION_KIND_ICONS, SortIcon } from '@/ui/icons';
import { colors } from '@/ui/theme';

const STATUS: Record<PlannedSession['status'], { label: string; tone: Tone }> = {
  planned: { label: 'Planned', tone: 'neutral' },
  done: { label: 'Done', tone: 'accent' },
  skipped: { label: 'Skipped', tone: 'warning' },
  sick: { label: 'Sick day', tone: 'warning' },
  travel: { label: 'Travel', tone: 'neutral' },
  dropped: { label: 'Dropped', tone: 'danger' },
};

/** "Strength: lower body + core" -> "Lower body + core"; runs and rides use their plan's title. */
export function shortSessionTitle(session: PlannedSession): string {
  if (session.detail.kind === 'run' || session.detail.kind === 'bike' || session.detail.kind === 'swim') return session.detail.title;
  const label = SESSION_TYPES[session.sessionType].label;
  const rest = label.includes(':') ? label.slice(label.indexOf(':') + 1).trim() : label;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

const KIND_NAMES = { strength: 'Strength', run: 'Run', bike: 'Ride', swim: 'Swim', tennis: 'Tennis', mobility: 'Mobility', rest: 'Rest' } as const;

export function WeekList({ sessions, today }: { sessions: PlannedSession[]; today: DateKey }) {
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const shown = sessions
    .filter((s) => (upcomingOnly ? s.date >= today && s.sessionType !== 'rest' : true))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <>
      <SectionHeader
        title="This week"
        action={{
          label: upcomingOnly ? 'Upcoming' : 'Whole week',
          icon: <SortIcon color={colors.textDim} size={18} />,
          onPress: () => setUpcomingOnly((v) => !v),
        }}
      />
      {shown.length === 0 ? (
        <Card>
          <Body dim>{upcomingOnly ? 'Nothing left this week. Tap Upcoming to see the whole week.' : 'No plan for this week yet.'}</Body>
        </Card>
      ) : (
        <ListGroup>
          {shown.map((session, i) => {
            const kind = SESSION_TYPES[session.sessionType].kind;
            const Icon = SESSION_KIND_ICONS[kind];
            const isToday = session.date === today;
            const status = isToday && session.status === 'planned' ? { label: 'Today', tone: 'accent' as Tone } : STATUS[session.status];
            return (
              <ListRow
                key={session.id ?? session.date}
                icon={<Icon color={isToday ? colors.accent : colors.text} size={22} />}
                tileColor={isToday ? colors.accentSoft : undefined}
                title={shortSessionTitle(session)}
                subtitle={`${formatShortDate(session.date)} · ${KIND_NAMES[kind]}${session.variant !== 'normal' ? ` · ${session.variant}` : ''}`}
                value={session.sessionType === 'rest' ? '—' : `${session.targetMin} min`}
                caption={status.label}
                captionTone={status.tone}
                highlight={isToday}
                onPress={() => router.navigate('/train')}
                last={i === shown.length - 1}
              />
            );
          })}
        </ListGroup>
      )}
    </>
  );
}
