/**
 * Pure geometry for the smooth trend chart, kept apart from the drawing so it can be tested.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Up to `wanted` evenly spaced indexes into a list of `count` items, always including the first
 * and last, so labels spread across the chart instead of crowding.
 */
export function labelIndexes(count: number, wanted: number): number[] {
  if (count <= 0 || wanted <= 0) return [];
  if (count <= wanted) return Array.from({ length: count }, (_, i) => i);
  if (wanted === 1) return [count - 1];
  const out = new Set<number>();
  for (let i = 0; i < wanted; i++) out.add(Math.round((i * (count - 1)) / (wanted - 1)));
  return [...out].sort((a, b) => a - b);
}

/**
 * Up to `wanted` points to label, chosen by position along the x axis rather than by count.
 *
 * Readings are often uneven in time (weigh-ins cluster, then a gap), so labelling every Nth point
 * would bunch labels together. This picks the point nearest each evenly spaced x target, always
 * including the first and last, then drops any label that would sit within `minGap` of the one
 * before it. `xs` must be sorted ascending.
 */
export function labelIndexesByX(xs: readonly number[], wanted: number, minGap = 0): number[] {
  if (xs.length === 0 || wanted <= 0) return [];
  if (xs.length === 1) return [0];
  const first = xs[0];
  const last = xs[xs.length - 1];
  if (last === first || wanted === 1) return wanted === 1 ? [xs.length - 1] : [0];

  const picked = new Set<number>();
  for (let i = 0; i < wanted; i++) {
    const target = first + (i * (last - first)) / (wanted - 1);
    let best = 0;
    for (let j = 1; j < xs.length; j++) if (Math.abs(xs[j] - target) < Math.abs(xs[best] - target)) best = j;
    picked.add(best);
  }

  const sorted = [...picked].sort((a, b) => a - b);
  const kept: number[] = [];
  for (const index of sorted) {
    const isLast = index === xs.length - 1;
    const previous = kept.at(-1);
    if (previous !== undefined && xs[index] - xs[previous] < minGap) {
      // Too close to the label before: keep the last point's label and drop the other.
      if (isLast) kept[kept.length - 1] = index;
      continue;
    }
    kept.push(index);
  }
  return kept;
}

/**
 * A smooth SVG path through every point, using Catmull-Rom splines converted to cubic Béziers.
 * The curve passes exactly through each point. Control points are clamped between `top` and
 * `bottom` so a sharp swing cannot overshoot out of the plot area.
 */
export function smoothPath(points: readonly Point[], top: number, bottom: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${fmt(points[0].x)} ${fmt(points[0].y)}`;

  const clampY = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clampY(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clampY(p2.y - (p3.y - p1.y) / 6) };
    d += ` C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

/** The same curve closed down to the baseline, for the shaded area underneath. */
export function areaPath(points: readonly Point[], top: number, bottom: number): string {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points, top, bottom)} L${fmt(last.x)} ${fmt(bottom)} L${fmt(first.x)} ${fmt(bottom)} Z`;
}

/**
 * Maps values onto a plot. A flat series (every value equal) is given some room either side so
 * it draws as a line across the middle instead of dividing by zero.
 */
export function makeScale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): (v: number) => number {
  let lo = domainMin;
  let hi = domainMax;
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  return (v) => rangeMin + ((v - lo) / (hi - lo)) * (rangeMax - rangeMin);
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}
