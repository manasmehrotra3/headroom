import { TUNABLES } from '../config/tunables';

export interface Dedupable {
  id: number;
  startedAt: number;
  durationSec: number;
  type: string;
  source: string;
}

/** Order of preference when two records describe the same session: the watch wins. */
const SOURCE_PRIORITY: Record<string, number> = { health_connect: 0, apple_health: 0, mock: 0, workout: 1, manual: 2 };

/**
 * Finds records that describe the same session: same activity family, starts within
 * `startWithinMin`, durations within `durationWithinFraction`. Returns pairs
 * (duplicate id → kept id). The kept record is the one from the highest-priority source.
 */
export function findDuplicates(records: Dedupable[]): Map<number, number> {
  const t = TUNABLES.dedupe;
  const sorted = [...records].sort((a, b) => a.startedAt - b.startedAt);
  const result = new Map<number, number>();

  for (let i = 0; i < sorted.length; i += 1) {
    if (result.has(sorted[i].id)) continue;
    // `anchor` is the record kept so far for this cluster; later matches attach to it.
    let anchor = sorted[i];
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      if (result.has(b.id)) continue;
      if (Math.abs(b.startedAt - sorted[i].startedAt) > t.startWithinMin * 60000) break;
      if (anchor.type !== b.type) continue;
      const longer = Math.max(anchor.durationSec, b.durationSec);
      if (longer > 0 && Math.abs(anchor.durationSec - b.durationSec) / longer > t.durationWithinFraction) continue;

      const keep = (SOURCE_PRIORITY[anchor.source] ?? 9) <= (SOURCE_PRIORITY[b.source] ?? 9) ? anchor : b;
      const drop = keep === anchor ? b : anchor;
      result.set(drop.id, keep.id);
      anchor = keep;
    }
  }
  return result;
}
