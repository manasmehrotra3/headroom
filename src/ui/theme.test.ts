import { colors, elevation, gradient, setColorScheme, themedStyles } from './theme';

/** Puts the app back on its default palette, so test order never matters. */
afterEach(() => setColorScheme('dark'));

describe('setColorScheme', () => {
  it('swaps the palette in place, so screens holding the imported object see the new colors', () => {
    const held = colors;
    const darkBackground = colors.background;

    setColorScheme('light');

    expect(colors).toBe(held);
    expect(colors.background).not.toBe(darkBackground);
    expect(gradient.bottom).toBe(colors.background);
    expect(elevation.shadowOpacity).toBeLessThan(0.45);
  });

  it('restores every token when switching back', () => {
    const dark = { ...colors };
    setColorScheme('light');
    setColorScheme('dark');
    expect({ ...colors }).toEqual(dark);
  });

  it('defines the same tokens in both schemes, so no screen falls back to undefined', () => {
    const darkTokens = Object.keys(colors).sort();
    setColorScheme('light');
    expect(Object.keys(colors).sort()).toEqual(darkTokens);
    expect(Object.values(colors).every((value) => typeof value === 'string' && value.length > 0)).toBe(true);
  });
});

describe('themedStyles', () => {
  it('rebuilds after a switch, unlike a module-level StyleSheet.create', () => {
    const styles = themedStyles(() => ({ card: { backgroundColor: colors.surface } }));
    const inDark = styles.card.backgroundColor;

    setColorScheme('light');

    expect(styles.card.backgroundColor).not.toBe(inDark);
    expect(styles.card.backgroundColor).toBe(colors.surface);
  });

  it('is lazy: the factory only runs once per scheme, however often styles are read', () => {
    let built = 0;
    const styles = themedStyles(() => {
      built += 1;
      return { row: { gap: 8 } };
    });
    expect(built).toBe(0);

    styles.row;
    styles.row;
    expect(built).toBe(1);

    setColorScheme('light');
    styles.row;
    expect(built).toBe(2);
  });
});
