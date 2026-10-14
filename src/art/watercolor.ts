// Generative watercolor painting helpers.
// Technique: take a base polygon, recursively push edge midpoints outward/inward
// with gaussian noise, then stack many low-alpha fills of further-deformed copies.
// The overlapping translucent layers produce soft, organic watercolor "washes".
import { rgba } from './palette';

export type Pt = [number, number];
export type Rng = () => number;

/** Small seeded PRNG so paintings look the same every time. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const rand = (rng: Rng, a: number, b: number) => a + (b - a) * rng();

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d', { willReadFrequently: false })!;
}

/** Points on an ellipse. */
export function ellipsePoly(cx: number, cy: number, rx: number, ry: number, n = 14, rot = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

/** Recursively deform polygon edges. `spread` is in pixels, halves at each depth. */
export function deform(pts: Pt[], depth: number, spread: number, rng: Rng): Pt[] {
  if (depth <= 0) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const s = Math.min(spread, len * 0.6) * gauss(rng) * 0.5;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    const t = 0.5 + gauss(rng) * 0.08;
    out.push([a[0] + (b[0] - a[0]) * t + Math.cos(ang) * s, a[1] + (b[1] - a[1]) * t + Math.sin(ang) * s]);
  }
  return deform(out, depth - 1, spread * 0.55, rng);
}

export function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export interface WashOptions {
  layers?: number;
  alpha?: number;
  spread?: number;
  blend?: GlobalCompositeOperation;
}

/** Paint one watercolor wash of a shape. */
export function wash(
  ctx: CanvasRenderingContext2D,
  shape: Pt[],
  color: string,
  rng: Rng,
  { layers = 22, alpha = 0.05, spread = 40, blend = 'source-over' }: WashOptions = {},
): void {
  ctx.save();
  ctx.globalCompositeOperation = blend;
  const base = deform(shape, 3, spread, rng);
  for (let i = 0; i < layers; i++) {
    ctx.fillStyle = rgba(color, alpha);
    fillPoly(ctx, deform(base, 2, spread * 0.6, rng));
  }
  ctx.restore();
}

/** Convenience: watercolor blob (ellipse based). */
export function blob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  rng: Rng,
  opts: WashOptions = {},
): void {
  wash(ctx, ellipsePoly(cx, cy, rx, ry, 12, rand(rng, -0.12, 0.12)), color, rng, {
    spread: Math.min(rx, ry) * 0.3,
    ...opts,
  });
}

/** Warm paper with fibres and grain. */
export function paintPaper(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, rng: Rng): void {
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // large soft mottling
  for (let i = 0; i < 26; i++) {
    blob(ctx, rand(rng, 0, w), rand(rng, 0, h), rand(rng, 80, 260), rand(rng, 60, 200), '#E9DCC6', rng, {
      layers: 6,
      alpha: 0.035,
    });
  }
  ctx.restore();
  applyGrain(ctx, w, h, rng, 0.06);
}

/** Fine paper grain + fibres layered over whatever is already painted. */
export function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, strength = 0.05): void {
  ctx.save();
  const tile = grainTile(rng);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) {
    ctx.globalAlpha = Math.min(1, strength * 4);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
  }
  // fibres
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  const fibres = Math.round((w * h) / 9000);
  for (let i = 0; i < fibres; i++) {
    const x = rand(rng, 0, w);
    const y = rand(rng, 0, h);
    const a = rand(rng, 0, Math.PI);
    const l = rand(rng, 4, 16);
    ctx.strokeStyle = rng() < 0.5 ? 'rgba(150,120,90,0.06)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = rand(rng, 0.5, 1.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rand(rng, -2, 2), y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}

let cachedGrain: HTMLCanvasElement | null = null;
function grainTile(rng: Rng): HTMLCanvasElement {
  if (cachedGrain) return cachedGrain;
  const s = 128;
  const c = makeCanvas(s, s);
  const g = ctx2d(c);
  const img = g.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 228 + Math.floor(rng() * 27);
    img.data[i] = v;
    img.data[i + 1] = v - 4;
    img.data[i + 2] = v - 12;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  cachedGrain = c;
  return c;
}

/** A paper-grain tile as a data URL — used as a CSS overlay over the camera image. */
let grainUrl: string | null = null;
export function paperGrainDataUrl(): string {
  if (grainUrl) return grainUrl;
  const rng = mulberry32(77);
  const c = makeCanvas(256, 256);
  const g = ctx2d(c);
  g.fillStyle = '#F7EFE2';
  g.fillRect(0, 0, 256, 256);
  applyGrain(g, 256, 256, rng, 0.08);
  grainUrl = c.toDataURL('image/png');
  return grainUrl;
}

/** Soft dry-brush stroke along a path (used for stems, trunks, grass). */
export function brushStroke(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  color: string,
  width: number,
  rng: Rng,
  passes = 5,
  alpha = 0.25,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'multiply';
  for (let p = 0; p < passes; p++) {
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width * rand(rng, 0.7, 1.1);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + gauss(rng) * width * 0.08;
      const jy = y + gauss(rng) * width * 0.08;
      if (i === 0) ctx.moveTo(jx, jy);
      else ctx.lineTo(jx, jy);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** Soft radial glow. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
