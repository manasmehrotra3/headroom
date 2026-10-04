import { areaPath, labelIndexes, labelIndexesByX, makeScale, smoothPath } from './chartGeometry';

describe('labelIndexes', () => {
  it('spreads labels evenly and always includes both ends', () => {
    expect(labelIndexes(31, 6)).toEqual([0, 6, 12, 18, 24, 30]);
    expect(labelIndexes(100, 2)).toEqual([0, 99]);
  });

  it('labels everything when there are fewer points than labels', () => {
    expect(labelIndexes(4, 6)).toEqual([0, 1, 2, 3]);
  });

  it('never repeats an index when the rounding collides', () => {
    const out = labelIndexes(7, 6);
    expect(new Set(out).size).toBe(out.length);
    expect(out[0]).toBe(0);
    expect(out.at(-1)).toBe(6);
  });

  it('handles the empty and degenerate cases', () => {
    expect(labelIndexes(0, 6)).toEqual([]);
    expect(labelIndexes(5, 0)).toEqual([]);
    expect(labelIndexes(5, 1)).toEqual([4]);
  });
});

describe('smoothPath', () => {
  const pts = [
    { x: 0, y: 50 },
    { x: 10, y: 20 },
    { x: 20, y: 40 },
    { x: 30, y: 10 },
  ];

  it('starts at the first point and ends on the last', () => {
    const d = smoothPath(pts, 0, 100);
    expect(d.startsWith('M0 50')).toBe(true);
    expect(d.endsWith('30 10')).toBe(true);
  });

  it('passes through every point, one curve segment between each pair', () => {
    const d = smoothPath(pts, 0, 100);
    expect(d.match(/C/g)).toHaveLength(pts.length - 1);
    for (const p of pts.slice(1)) expect(d).toContain(` ${p.x} ${p.y}`);
  });

  it('keeps control points inside the plot even on a violent swing', () => {
    const spiky = [
      { x: 0, y: 95 },
      { x: 10, y: 2 },
      { x: 20, y: 98 },
      { x: 30, y: 1 },
    ];
    const numbers = smoothPath(spiky, 0, 100).match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = numbers.filter((_, i) => i % 2 === 1);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('draws nothing for no points and a bare move for one', () => {
    expect(smoothPath([], 0, 100)).toBe('');
    expect(smoothPath([{ x: 5, y: 5 }], 0, 100)).toBe('M5 5');
  });
});

describe('areaPath', () => {
  it('closes the curve down to the baseline', () => {
    const d = areaPath(
      [
        { x: 0, y: 10 },
        { x: 50, y: 30 },
      ],
      0,
      80,
    );
    expect(d.endsWith('L50 80 L0 80 Z')).toBe(true);
  });

  it('needs at least two points to make an area', () => {
    expect(areaPath([{ x: 0, y: 0 }], 0, 80)).toBe('');
  });
});

describe('makeScale', () => {
  it('maps the domain onto the range, including an inverted one for screen y', () => {
    const y = makeScale(150, 200, 100, 0);
    expect(y(150)).toBe(100);
    expect(y(200)).toBe(0);
    expect(y(175)).toBe(50);
  });

  it('does not divide by zero when every value is the same', () => {
    const y = makeScale(176, 176, 100, 0);
    expect(y(176)).toBe(50);
  });
});

describe('labelIndexesByX', () => {
  it('spaces labels by position, so clustered readings do not bunch labels together', () => {
    // Five readings in the first two days, then one every week.
    const xs = [0, 0.5, 1, 1.5, 2, 9, 16, 23, 30];
    const picked = labelIndexesByX(xs, 4);
    const positions = picked.map((i) => xs[i]);
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(30);
    // By index this would label 0, 1.5, 9 and 30; by position it reaches the middle of the range.
    expect(positions).toContain(9);
    expect(positions).toContain(23);
  });

  it('drops a label that would crowd its neighbour, but never loses the last one', () => {
    const xs = [0, 10, 20, 29, 30];
    const picked = labelIndexesByX(xs, 5, 5);
    const positions = picked.map((i) => xs[i]);
    expect(positions.at(-1)).toBe(30);
    for (let i = 1; i < positions.length; i++) expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(5);
  });

  it('handles tiny inputs', () => {
    expect(labelIndexesByX([], 6)).toEqual([]);
    expect(labelIndexesByX([5], 6)).toEqual([0]);
    expect(labelIndexesByX([3, 3, 3], 6)).toEqual([0]);
  });
});
