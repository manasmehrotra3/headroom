/**
 * What you actually did today, under the plan: every recorded session, whether it came from the
 * watch, an in-app workout or a manual log. Duplicates are left out, so a session the watch and
 * the app both recorded appears once.
 */
import type { ActivityRow } from '@/db/repos/activityRepo';
import { activityDetailLine, doneSummary, rpeLabel } from '@/domain/activitySummary';
import { formatDuration } from '@/domain/units';
import { ListGroup, ListRow, SectionHeader } from '@/ui/cards';
import { Body } from '@/ui/components';
import { formatClock } from '@/ui/format';
import { ACTIVITY_ICONS } from '@/ui/icons';
import { colors } from '@/ui/theme';

export function DoneToday({ activities }: { activities: ActivityRow[] }) {
  const done = activities.filter((a) => a.duplicateOf === null).sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  if (done.length === 0) return null;

  return (
    <>
      <SectionHeader title="Done today" />
      <ListGroup>
        {done.map((a, i) => {
          const Icon = ACTIVITY_ICONS[a.type];
          return (
            <ListRow
              key={a.id}
              icon={<Icon color={colors.accent} size={22} />}
              tileColor={colors.accentSoft}
              title={a.title}
              subtitle={activityDetailLine({ time: formatClock(a.startedAt), distanceM: a.distanceM, avgHr: a.avgHr })}
              value={formatDuration(a.durationSec)}
              caption={rpeLabel(a.rpe, a.rpeEstimated)}
              last={i === done.length - 1}
            />
          );
        })}
      </ListGroup>
      <Body dim>{doneSummary(done.map((a) => a.durationSec))}</Body>
    </>
  );
}
