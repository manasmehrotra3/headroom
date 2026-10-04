/**
 * Generates every app icon from one vector description, so they can never drift apart.
 *
 *   node scripts/make-icons.js
 *
 * The mark: three rising bars under a ceiling line, with a gap left above the tallest one.
 * That is the app in one picture — training load climbing toward a cap you deliberately
 * do not exceed. It echoes the bar charts on the insight screens.
 *
 * There is no SVG rasteriser on this machine, so the shapes are sampled directly. Everything
 * is built from one primitive, a line segment with round caps, which also gives the bars and
 * the ceiling. Coverage is sampled 4x4 per pixel, which is plenty of anti-aliasing at these
 * sizes.
 *
 * Scaling matters: Android masks adaptive icons to a circle on some launchers, so the
 * foreground and monochrome layers are drawn smaller to stay inside that circle. See SCALES.
 */
const path = require('path');
const Jimp = require('jimp-compact');

const ASSETS = path.join(__dirname, '..', 'assets');

// Pulled from src/ui/theme.ts. Keep them in step.
const BACKGROUND = '#0E0F12';
const ACCENT = '#4ADE80';
const ACCENT_DIM = '#3C9A69';
const TEXT = '#F2F4F7';

const CANVAS = 1024;
const CENTRE = CANVAS / 2;
const SS = 4; // supersamples per axis

/**
 * How much of the canvas the mark fills, per output. The adaptive figure is the one that
 * matters: a launcher may mask the icon to a circle of radius 0.333 of the canvas, and at
 * full size the mark's corners sit well outside that. Verified by masking the rendered
 * foreground and looking at it, not by arithmetic alone.
 */
const SCALES = { fullBleed: 0.86, adaptive: 0.72, splash: 0.9, notification: 0.82 };

function hexToRgb(colour) {
  const n = parseInt(colour.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length2 = dx * dx + dy * dy;
  let t = length2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / length2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** A line segment with round caps, scaled about the centre of the canvas. */
function bar(x1, y1, x2, y2, width, scale) {
  const s = (v) => CENTRE + (v - CENTRE) * scale;
  const w = width * scale;
  return (x, y) => distanceToSegment(x, y, s(x1), s(y1), s(x2), s(y2)) <= w / 2;
}

/**
 * The mark, as coloured layers. Coordinates are chosen so the whole thing is centred on the
 * canvas: it spans 243..781 horizontally and 214..811 vertically before scaling.
 *
 * The ceiling is no wider than the bar group on purpose. When it overhung, its ends were the
 * furthest thing from the centre and a circular launcher mask sliced them off.
 */
function markLayers(scale, { monochrome = false } = {}) {
  const ceiling = monochrome ? '#FFFFFF' : TEXT;
  const shortBars = monochrome ? '#FFFFFF' : ACCENT_DIM;
  const tallBar = monochrome ? '#FFFFFF' : ACCENT;
  return [
    { colour: ceiling, opacity: 1, parts: [bar(266, 237, 758, 237, 46, scale)] },
    {
      colour: shortBars,
      // The monochrome layer is a single flat colour, so the shorter bars are dimmed with
      // opacity instead. Android tints the whole thing anyway.
      opacity: monochrome ? 0.55 : 1,
      parts: [bar(334, 743, 334, 589, 136, scale), bar(512, 743, 512, 489, 136, scale)],
    },
    { colour: tallBar, opacity: 1, parts: [bar(690, 743, 690, 371, 136, scale)] },
  ];
}

/**
 * The mark for a notification's small icon.
 *
 * Android throws away the colours of a small icon and draws its alpha channel as a silhouette,
 * tinted with the notification's colour. So everything here is solid white on transparency, and
 * the ceiling line is nearly twice as thick as usual: at 24dp the normal one is barely a pixel
 * and disappears. Leaving this unset is what made the notification show a filled blob, because
 * the launcher icon is opaque corner to corner and its silhouette is simply a square.
 */
function notificationLayers(scale) {
  return [
    { colour: '#FFFFFF', opacity: 1, parts: [bar(266, 237, 758, 237, 88, scale)] },
    {
      colour: '#FFFFFF',
      opacity: 1,
      parts: [bar(334, 743, 334, 589, 136, scale), bar(512, 743, 512, 489, 136, scale), bar(690, 743, 690, 371, 136, scale)],
    },
  ];
}

/** Rasterises layers onto a square canvas. `background` may be null for transparency. */
function render(size, background, layers) {
  const image = new Jimp(size, size, 0x00000000);
  const backgroundRgb = background ? hexToRgb(background) : null;
  const scaleToCanvas = size / CANVAS;

  const parts = [];
  for (const layer of layers) {
    const rgb = hexToRgb(layer.colour);
    for (const hit of layer.parts) parts.push({ rgb, alpha: layer.opacity, hit });
  }

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let [r, g, b] = backgroundRgb ?? [0, 0, 0];
      let a = backgroundRgb ? 1 : 0;

      for (const { rgb, alpha, hit } of parts) {
        let covered = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const x = (px + (sx + 0.5) / SS) / scaleToCanvas;
            const y = (py + (sy + 0.5) / SS) / scaleToCanvas;
            if (hit(x, y)) covered++;
          }
        }
        if (covered === 0) continue;

        const cov = (covered / (SS * SS)) * alpha;
        const outA = cov + a * (1 - cov);
        r = (rgb[0] * cov + r * a * (1 - cov)) / outA;
        g = (rgb[1] * cov + g * a * (1 - cov)) / outA;
        b = (rgb[2] * cov + b * a * (1 - cov)) / outA;
        a = outA;
      }

      const packed =
        (((Math.round(r) & 255) << 24) | ((Math.round(g) & 255) << 16) | ((Math.round(b) & 255) << 8) | (Math.round(a * 255) & 255)) >>> 0;
      image.bitmap.data.writeUInt32BE(packed, (py * size + px) * 4);
    }
  }
  return image;
}

const OUTPUTS = [
  // Square icon with the background baked in, for launchers that don't use adaptive icons.
  { file: 'icon.png', size: 1024, background: BACKGROUND, layers: () => markLayers(SCALES.fullBleed) },
  // Adaptive icon: Android composites these two and masks the result.
  { file: 'android-icon-foreground.png', size: 1024, background: null, layers: () => markLayers(SCALES.adaptive) },
  { file: 'android-icon-background.png', size: 1024, background: BACKGROUND, layers: () => [] },
  // Themed icons: Android recolours this to match the wallpaper, so shape is all that matters.
  { file: 'android-icon-monochrome.png', size: 1024, background: null, layers: () => markLayers(SCALES.adaptive, { monochrome: true }) },
  // Splash: shown with resizeMode "contain" over the app's background colour.
  { file: 'splash-icon.png', size: 1024, background: null, layers: () => markLayers(SCALES.splash) },
  { file: 'favicon.png', size: 48, background: BACKGROUND, layers: () => markLayers(SCALES.fullBleed) },
  // Android notification small icon: white silhouette, transparent, tinted by the app's accent.
  { file: 'notification-icon.png', size: 256, background: null, layers: () => notificationLayers(SCALES.notification) },
];

async function main() {
  for (const { file, size, background, layers } of OUTPUTS) {
    const image = render(size, background, layers());
    await image.writeAsync(path.join(ASSETS, file));
    console.log(`wrote assets/${file} (${size}px)`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

// Exported so a preview script can re-render the mark at other scales without duplicating it.
module.exports = { render, markLayers, SCALES, BACKGROUND, CANVAS };
