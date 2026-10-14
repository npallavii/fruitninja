// Hand-painted (generative) watercolor environments.
// Every painter works at any size so the same code renders the full game background
// and the small level-select thumbnails.
import { PALETTE, RAINBOW, rgba } from './palette';
import {
  applyGrain,
  blob,
  brushStroke,
  ctx2d,
  glow,
  makeCanvas,
  mulberry32,
  paintPaper,
  rand,
  wash,
  type Pt,
  type Rng,
} from './watercolor';
import type { LevelId } from '../state/types';

function hillShape(w: number, h: number, baseY: number, amp: number, bumps: number, rng: Rng): Pt[] {
  const pts: Pt[] = [[-w * 0.1, h * 1.1]];
  const steps = 18;
  const phase = rand(rng, 0, Math.PI * 2);
  for (let i = 0; i <= steps; i++) {
    const x = -w * 0.1 + (i / steps) * w * 1.2;
    const y = baseY - Math.sin((i / steps) * Math.PI * bumps + phase) * amp - rand(rng, 0, amp * 0.25);
    pts.push([x, y]);
  }
  pts.push([w * 1.1, h * 1.1]);
  return pts;
}

export function paintFlower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rng: Rng): void {
  const petals = 5;
  const rot = rand(rng, 0, Math.PI);
  for (let i = 0; i < petals; i++) {
    const a = rot + (i / petals) * Math.PI * 2;
    blob(ctx, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.38, color, rng, {
      layers: 7,
      alpha: 0.16,
      spread: r * 0.25,
    });
  }
  blob(ctx, x, y, r * 0.28, r * 0.28, PALETTE.honey, rng, { layers: 6, alpha: 0.3, spread: r * 0.1 });
}

function paintTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number, rng: Rng, fruit = true): void {
  const topY = groundY - 420 * scale;
  brushStroke(
    ctx,
    [
      [x, groundY + 10],
      [x + 6 * scale, groundY - 140 * scale],
      [x - 4 * scale, topY + 120 * scale],
    ],
    PALETTE.bark,
    30 * scale,
    rng,
    5,
    0.16,
  );
  // canopy: clustered blobs in layered greens
  const greens = [PALETTE.sage, PALETTE.matcha, '#9DBF84', PALETTE.matcha];
  for (let i = 0; i < 9; i++) {
    const a = rand(rng, 0, Math.PI * 2);
    const d = rand(rng, 0, 90 * scale);
    blob(ctx, x + Math.cos(a) * d * 1.3, topY + Math.sin(a) * d * 0.8, rand(rng, 70, 110) * scale, rand(rng, 60, 95) * scale, greens[i % greens.length], rng, {
      layers: 9,
      alpha: 0.075,
    });
  }
  // sunlit highlights on the canopy
  for (let i = 0; i < 4; i++) {
    blob(ctx, x - 30 * scale + rand(rng, -40, 40) * scale, topY - 40 * scale + rand(rng, -30, 30) * scale, 40 * scale, 30 * scale, '#C9DDB3', rng, { layers: 6, alpha: 0.1 });
  }
  if (fruit) {
    for (let i = 0; i < 7; i++) {
      const a = rand(rng, 0, Math.PI * 2);
      const d = rand(rng, 20, 120 * scale);
      const c = [PALETTE.apricot, PALETTE.blush, PALETTE.honey][i % 3];
      blob(ctx, x + Math.cos(a) * d * 1.2, topY + Math.sin(a) * d * 0.7, 13 * scale, 13 * scale, c, rng, {
        layers: 6,
        alpha: 0.28,
        spread: 4 * scale,
      });
    }
  }
}

function paintMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rng: Rng): void {
  blob(ctx, x, y - 18 * s, 11 * s, 24 * s, PALETTE.cream, rng, { layers: 8, alpha: 0.5, blend: 'source-over', spread: 4 * s });
  blob(ctx, x, y - 18 * s, 11 * s, 24 * s, PALETTE.oatmeal, rng, { layers: 4, alpha: 0.2, spread: 4 * s });
  wash(
    ctx,
    [
      [x - 38 * s, y - 38 * s],
      [x - 26 * s, y - 62 * s],
      [x, y - 72 * s],
      [x + 26 * s, y - 62 * s],
      [x + 38 * s, y - 38 * s],
    ],
    PALETTE.blush,
    rng,
    { layers: 12, alpha: 0.12, spread: 6 * s },
  );
  for (let i = 0; i < 4; i++) {
    blob(ctx, x + rand(rng, -24, 24) * s, y - rand(rng, 46, 62) * s, 5 * s, 4 * s, PALETTE.cream, rng, {
      layers: 4,
      alpha: 0.6,
      blend: 'source-over',
      spread: 2 * s,
    });
  }
}

function paintClouds(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, count: number, yMax: number): void {
  for (let i = 0; i < count; i++) {
    const cx = rand(rng, 0, w);
    const cy = rand(rng, h * 0.04, yMax);
    const s = rand(rng, 0.6, 1.2) * (w / 1600);
    blob(ctx, cx, cy + 26 * s, 150 * s, 22 * s, PALETTE.lavender, rng, { layers: 6, alpha: 0.05 });
    ctx.save();
    for (let j = 0; j < 6; j++) {
      const px = cx + (j - 2.5) * 42 * s + rand(rng, -10, 10) * s;
      const py = cy - Math.sin((j / 5) * Math.PI) * 28 * s + rand(rng, -6, 6) * s;
      glow(ctx, px, py, rand(rng, 55, 80) * s, '#FFFEFA', 0.75);
    }
    ctx.restore();
  }
}

function paintRainbow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, band: number, rng: Rng, alpha = 0.16): void {
  RAINBOW.forEach((c, i) => {
    const rr = r - i * band;
    const pts: Pt[] = [];
    for (let a = Math.PI * 1.04; a <= Math.PI * 1.96; a += 0.06) pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    brushStroke(ctx, pts, c, band * 1.15, rng, 4, alpha);
  });
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, rgba('#E2CDB0', 0.28));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Level 1 — The Giggle Garden. Busy edges, calm open centre for fruit and the child. */
export function paintGiggleGarden(w: number, h: number, opts: { rainbow?: boolean; seed?: number } = {}): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = mulberry32(opts.seed ?? 2024);
  const k = w / 1600;

  paintPaper(ctx, w, h, PALETTE.paper, rng);

  // soft sky: lavender-blue at the top melting into warm cream
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, 'rgba(214,226,240,0.85)');
  sky.addColorStop(0.45, 'rgba(232,236,240,0.55)');
  sky.addColorStop(1, 'rgba(247,240,228,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.7);
  glow(ctx, w * 0.84, h * 0.1, 300 * k, '#FBE7B5', 0.65);
  glow(ctx, w * 0.84, h * 0.1, 90 * k, '#FFF6DC', 0.9);

  if (opts.rainbow) paintRainbow(ctx, w * 0.5, h * 0.78, w * 0.42, 20 * k, rng);
  paintClouds(ctx, w, h, rng, 6, h * 0.3);

  // hills, back to front
  wash(ctx, hillShape(w, h, h * 0.6, 40 * k, 3, rng), PALETTE.sage, rng, { layers: 16, alpha: 0.045, spread: 60 * k });
  wash(ctx, hillShape(w, h, h * 0.7, 30 * k, 2, rng), PALETTE.matcha, rng, { layers: 16, alpha: 0.05, spread: 60 * k });

  // distant little trees
  paintTree(ctx, w * 0.22, h * 0.68, 0.38 * k, rng, false);
  paintTree(ctx, w * 0.79, h * 0.67, 0.42 * k, rng, false);

  // big framing trees
  paintTree(ctx, w * 0.06, h * 0.98, 1.05 * k, rng);
  paintTree(ctx, w * 0.95, h * 0.98, 1.0 * k, rng);

  // foreground meadow
  wash(ctx, hillShape(w, h, h * 0.86, 18 * k, 2, rng), '#9DBF84', rng, { layers: 18, alpha: 0.06, spread: 50 * k });

  // bushes on the sides
  for (const side of [0, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = side === 0 ? rand(rng, -20, 260) * k : w - rand(rng, -20, 260) * k;
      blob(ctx, x, h * rand(rng, 0.84, 0.97), rand(rng, 70, 120) * k, rand(rng, 45, 70) * k, i % 2 ? PALETTE.matcha : PALETTE.leaf, rng, {
        layers: 10,
        alpha: 0.07,
      });
    }
  }

  // flower beds — dense at the sides, sparse in the middle
  const colors = [PALETTE.blush, PALETTE.apricot, PALETTE.lavender, PALETTE.honey, PALETTE.plum];
  for (let i = 0; i < 46; i++) {
    const t = rng();
    const x = t < 0.42 ? rand(rng, 0, w * 0.3) : t < 0.84 ? rand(rng, w * 0.7, w) : rand(rng, w * 0.3, w * 0.7);
    const y = h * rand(rng, 0.84, 0.99);
    paintFlower(ctx, x, y, rand(rng, 9, 17) * k, colors[i % colors.length], rng);
  }
  // grass tufts
  for (let i = 0; i < 60; i++) {
    const x = rand(rng, 0, w);
    const y = h * rand(rng, 0.88, 1.0);
    const l = rand(rng, 14, 30) * k;
    brushStroke(ctx, [[x, y], [x + rand(rng, -6, 6) * k, y - l]], PALETTE.leafDeep, 3 * k, rng, 2, 0.25);
  }

  paintMushroom(ctx, w * 0.15, h * 0.93, 0.9 * k, rng);
  paintMushroom(ctx, w * 0.185, h * 0.95, 0.6 * k, rng);
  paintMushroom(ctx, w * 0.86, h * 0.94, 0.8 * k, rng);

  vignette(ctx, w, h);
  applyGrain(ctx, w, h, rng, 0.04);
  return c;
}

/** Level 2 — The Wiggly Waterway (thumbnail + future level). */
export function paintWaterway(w: number, h: number, seed = 7): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = mulberry32(seed);
  const k = w / 1600;
  paintPaper(ctx, w, h, PALETTE.paper, rng);
  wash(ctx, [[0, 0], [w, 0], [w, h * 0.5], [0, h * 0.5]], PALETTE.sky, rng, { layers: 14, alpha: 0.05, spread: 100 * k });
  paintClouds(ctx, w, h, rng, 4, h * 0.25);
  wash(ctx, hillShape(w, h, h * 0.48, 34 * k, 3, rng), PALETTE.sage, rng, { layers: 14, alpha: 0.05, spread: 60 * k });
  wash(ctx, hillShape(w, h, h * 0.56, 20 * k, 2, rng), PALETTE.matcha, rng, { layers: 14, alpha: 0.05, spread: 50 * k });
  // river band
  const river: Pt[] = [[-w * 0.1, h * 0.62], [w * 0.3, h * 0.6], [w * 0.7, h * 0.64], [w * 1.1, h * 0.61], [w * 1.1, h * 0.88], [w * 0.6, h * 0.9], [-w * 0.1, h * 0.86]];
  wash(ctx, river, PALETTE.water, rng, { layers: 20, alpha: 0.07, spread: 40 * k });
  wash(ctx, river, PALETTE.slate, rng, { layers: 8, alpha: 0.03, spread: 40 * k });
  for (let i = 0; i < 18; i++) {
    const x = rand(rng, 0, w);
    const y = h * rand(rng, 0.65, 0.85);
    brushStroke(ctx, [[x, y], [x + rand(rng, 40, 90) * k, y + rand(rng, -3, 3)]], '#FFFFFF', 4 * k, rng, 2, 0.5);
  }
  // lily pads & lotus
  for (let i = 0; i < 7; i++) {
    const x = rand(rng, w * 0.1, w * 0.9);
    const y = h * rand(rng, 0.66, 0.84);
    blob(ctx, x, y, 46 * k, 18 * k, PALETTE.matcha, rng, { layers: 10, alpha: 0.12 });
    if (i % 2 === 0) paintFlower(ctx, x + 10 * k, y - 10 * k, 16 * k, PALETTE.blush, rng);
  }
  // stepping stones
  for (let i = 0; i < 5; i++) {
    blob(ctx, w * (0.2 + i * 0.15), h * rand(rng, 0.9, 0.95), 52 * k, 20 * k, '#C8BFB2', rng, { layers: 10, alpha: 0.12 });
  }
  wash(ctx, [[-w * 0.1, h * 0.9], [w * 1.1, h * 0.9], [w * 1.1, h * 1.1], [-w * 0.1, h * 1.1]], PALETTE.leaf, rng, { layers: 10, alpha: 0.05, spread: 30 * k });
  // reeds
  for (let i = 0; i < 30; i++) {
    const x = rng() < 0.5 ? rand(rng, 0, w * 0.18) : rand(rng, w * 0.82, w);
    const y = h * rand(rng, 0.72, 0.98);
    const l = rand(rng, 90, 190) * k;
    brushStroke(ctx, [[x, y], [x + rand(rng, -10, 10) * k, y - l * 0.6], [x + rand(rng, -20, 20) * k, y - l]], PALETTE.leafDeep, 6 * k, rng, 3, 0.2);
  }
  vignette(ctx, w, h);
  return c;
}

/** Level 3 — The Cloudberry Sky (thumbnail + future level). */
export function paintSky(w: number, h: number, seed = 11): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = mulberry32(seed);
  const k = w / 1600;
  paintPaper(ctx, w, h, PALETTE.paper, rng);
  wash(ctx, [[0, 0], [w, 0], [w, h * 0.6], [0, h * 0.5]], PALETTE.lavender, rng, { layers: 18, alpha: 0.06, spread: 140 * k });
  wash(ctx, [[0, h * 0.4], [w, h * 0.35], [w, h], [0, h]], PALETTE.blush, rng, { layers: 14, alpha: 0.04, spread: 140 * k });
  paintRainbow(ctx, w * 0.62, h * 0.95, w * 0.38, 18 * k, rng, 0.14);
  paintClouds(ctx, w, h, rng, 9, h * 0.9);
  // floating islands
  const islands: [number, number, number][] = [[0.18, 0.62, 1], [0.78, 0.48, 0.8], [0.48, 0.8, 0.6]];
  for (const [ix, iy, s] of islands) {
    const x = w * ix;
    const y = h * iy;
    const r = 150 * s * k;
    wash(ctx, [[x - r, y], [x + r, y], [x + r * 0.3, y + r * 0.9], [x - r * 0.2, y + r * 0.8]], PALETTE.bark, rng, { layers: 12, alpha: 0.07, spread: r * 0.2 });
    blob(ctx, x, y - 6 * k, r * 1.05, r * 0.25, PALETTE.matcha, rng, { layers: 12, alpha: 0.1 });
    paintFlower(ctx, x - r * 0.4, y - 16 * k, 14 * k, PALETTE.blush, rng);
    paintFlower(ctx, x + r * 0.3, y - 14 * k, 12 * k, PALETTE.honey, rng);
  }
  // tiny stars
  for (let i = 0; i < 24; i++) {
    blob(ctx, rand(rng, 0, w), rand(rng, 0, h * 0.5), 3 * k, 3 * k, PALETTE.honey, rng, { layers: 3, alpha: 0.5, spread: 1 });
  }
  vignette(ctx, w, h);
  return c;
}

export function paintLevel(id: LevelId, w: number, h: number): HTMLCanvasElement {
  if (id === 'waterway') return paintWaterway(w, h);
  if (id === 'sky') return paintSky(w, h);
  return paintGiggleGarden(w, h);
}

/** Full-size level background, painted once and reused between rounds. */
const levelCache = new Map<LevelId, HTMLCanvasElement>();
export function levelCanvas(id: LevelId): HTMLCanvasElement {
  if (!levelCache.has(id)) levelCache.set(id, paintLevel(id, 1600, 900));
  return levelCache.get(id)!;
}

// Cached data URLs for React backdrops / thumbnails.
const urlCache = new Map<string, string>();
export function paintedUrl(key: string, paint: () => HTMLCanvasElement, type = 'image/jpeg'): string {
  const hit = urlCache.get(key);
  if (hit) return hit;
  const url = paint().toDataURL(type, 0.9);
  urlCache.set(key, url);
  return url;
}

export function levelThumbUrl(id: LevelId): string {
  return paintedUrl(`thumb-${id}`, () => paintLevel(id, 640, 400));
}
