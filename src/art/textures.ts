// Procedural textures for effects and the living garden. Generated once, cached,
// and registered into Phaser as canvas textures.
import { FRUIT_KINDS, drawCrystal, drawFruit, drawFruitHalf } from './fruits';
import { PALETTE, SPLASH_COLORS, rgba } from './palette';
import { blob, ctx2d, makeCanvas, mulberry32, rand } from './watercolor';

export const FLOWER_COLORS = [PALETTE.blush, PALETTE.apricot, PALETTE.lavender, PALETTE.honey, PALETTE.plum] as const;
export const BUTTERFLY_COLORS = [PALETTE.blush, PALETTE.lavender, PALETTE.honey, PALETTE.slate] as const;

let cache: Map<string, HTMLCanvasElement> | null = null;

export function splashKey(colorIndex: number, variant: number): string {
  return `splash-${colorIndex}-${variant}`;
}

export function getTextures(): Map<string, HTMLCanvasElement> {
  if (cache) return cache;
  const t = new Map<string, HTMLCanvasElement>();
  const rng = mulberry32(31);

  for (const k of FRUIT_KINDS) {
    t.set(`fruit-${k}`, drawFruit(k));
    t.set(`fruit-${k}-top`, drawFruitHalf(k, 'top'));
    t.set(`fruit-${k}-bottom`, drawFruitHalf(k, 'bottom'));
  }
  t.set('crystal', drawCrystal());

  SPLASH_COLORS.forEach((color, ci) => {
    for (let v = 0; v < 3; v++) t.set(splashKey(ci, v), splash(color, rng));
  });
  FLOWER_COLORS.forEach((color, i) => {
    t.set(`petal-${i}`, petal(color));
    t.set(`bloom-${i}`, flowerHead(color, true));
    t.set(`bud-${i}`, flowerHead(color, false));
  });
  BUTTERFLY_COLORS.forEach((color, i) => t.set(`wing-${i}`, wing(color)));
  t.set('stem', stem());
  t.set('glow', softGlow());
  t.set('sparkle', sparkle());
  t.set('ripple', ripple());
  t.set('koi', koi());
  t.set('lotus', lotus());
  t.set('frost', frost(rng));

  cache = t;
  return t;
}

/** Splash colour index nearest to a hex colour (fruit juice → splash). */
export function splashIndexFor(hex: string): number {
  const i = SPLASH_COLORS.indexOf(hex as (typeof SPLASH_COLORS)[number]);
  return i >= 0 ? i : 0;
}

// ---------------------------------------------------------------- painters

function splash(color: string, rng: () => number): HTMLCanvasElement {
  const S = 256;
  const c = makeCanvas(S, S);
  const ctx = ctx2d(c);
  // main bloom
  blob(ctx, S / 2, S / 2, S * 0.3, S * 0.27, color, rng, { layers: 18, alpha: 0.09, blend: 'source-over', spread: S * 0.14 });
  // darker pooled edge
  blob(ctx, S / 2 + rand(rng, -10, 10), S / 2 + rand(rng, -10, 10), S * 0.22, S * 0.2, color, rng, { layers: 8, alpha: 0.07, blend: 'source-over' });
  // satellite drops
  for (let i = 0; i < 6; i++) {
    const a = rand(rng, 0, Math.PI * 2);
    const d = rand(rng, S * 0.3, S * 0.42);
    const r = rand(rng, 5, 13);
    blob(ctx, S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, r, r, color, rng, { layers: 6, alpha: 0.16, blend: 'source-over', spread: r * 0.4 });
  }
  return c;
}

function petal(color: string): HTMLCanvasElement {
  const c = makeCanvas(40, 40);
  const ctx = ctx2d(c);
  const g = ctx.createLinearGradient(8, 8, 32, 32);
  g.addColorStop(0, '#FFF8F2');
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(20, 4);
  ctx.bezierCurveTo(34, 10, 34, 28, 20, 36);
  ctx.bezierCurveTo(6, 28, 6, 10, 20, 4);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 1;
  ctx.stroke();
  return c;
}

/** A flower head: closed sleepy bud or open smiling bloom. */
function flowerHead(color: string, open: boolean): HTMLCanvasElement {
  const S = 120;
  const c = makeCanvas(S, S);
  const ctx = ctx2d(c);
  const cx = S / 2;
  const cy = S / 2;
  if (open) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
      ctx.rotate(a + Math.PI / 2);
      const g = ctx.createRadialGradient(0, 8, 2, 0, 0, 30);
      g.addColorStop(0, '#FFF9F3');
      g.addColorStop(1, color);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(color, 1);
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.honey;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba('#D9B465', 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    face(ctx, cx, cy + 1, 1, true);
  } else {
    // closed teardrop bud with a sleepy face
    const g = ctx.createLinearGradient(cx, cy - 34, cx, cy + 30);
    g.addColorStop(0, color);
    g.addColorStop(1, '#FFF4EA');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 34);
    ctx.bezierCurveTo(cx + 30, cy - 10, cx + 26, cy + 26, cx, cy + 28);
    ctx.bezierCurveTo(cx - 26, cy + 26, cx - 30, cy - 10, cx, cy - 34);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 1);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.matcha;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + 30);
      ctx.quadraticCurveTo(cx + s * 30, cy + 22, cx + s * 22, cy + 2);
      ctx.quadraticCurveTo(cx + s * 12, cy + 18, cx, cy + 30);
      ctx.fill();
    }
    face(ctx, cx, cy + 4, 0.9, false);
  }
  return c;
}

function face(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, awake: boolean): void {
  ctx.strokeStyle = '#5B4B4F';
  ctx.fillStyle = '#5B4B4F';
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    if (awake) {
      ctx.beginPath();
      ctx.arc(x + side * 7 * s, y - 3 * s, 2.6 * s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x + side * 7 * s, y - 4 * s, 3.4 * s, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(236,128,140,0.45)';
    ctx.beginPath();
    ctx.ellipse(x + side * 12 * s, y + 3 * s, 3.6 * s, 2.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5B4B4F';
  }
  ctx.beginPath();
  if (awake) ctx.arc(x, y + 3 * s, 4 * s, Math.PI * 0.1, Math.PI * 0.9);
  else ctx.arc(x, y + 5 * s, 2 * s, 0, Math.PI * 2);
  ctx.stroke();
}

function stem(): HTMLCanvasElement {
  const c = makeCanvas(60, 160);
  const ctx = ctx2d(c);
  ctx.strokeStyle = PALETTE.leafDeep;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(30, 160);
  ctx.quadraticCurveTo(24, 80, 30, 4);
  ctx.stroke();
  ctx.fillStyle = PALETTE.matcha;
  for (const [y, s] of [[110, 1], [70, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(29, y);
    ctx.quadraticCurveTo(29 + s * 26, y - 22, 29 + s * 28, y - 4);
    ctx.quadraticCurveTo(29 + s * 14, y + 6, 29, y);
    ctx.fill();
  }
  return c;
}

function wing(color: string): HTMLCanvasElement {
  // a pair of wings, drawn facing up; flapping is done by scaling X
  const c = makeCanvas(90, 70);
  const ctx = ctx2d(c);
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(45, 35, 4, 45 + s * 28, 28, 36);
    g.addColorStop(0, '#FFF8F2');
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(45 + s * 22, 24, 22, 18, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(45 + s * 16, 48, 14, 12, -s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(45 + s * 26, 22, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#7A6468';
  ctx.beginPath();
  ctx.ellipse(45, 36, 4, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7A6468';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(44, 20);
  ctx.quadraticCurveTo(38, 8, 34, 6);
  ctx.moveTo(46, 20);
  ctx.quadraticCurveTo(52, 8, 56, 6);
  ctx.stroke();
  return c;
}

function softGlow(): HTMLCanvasElement {
  const c = makeCanvas(128, 128);
  const ctx = ctx2d(c);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

function sparkle(): HTMLCanvasElement {
  const c = makeCanvas(48, 48);
  const ctx = ctx2d(c);
  const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
  g.addColorStop(0, 'rgba(255,248,225,0.9)');
  g.addColorStop(1, 'rgba(255,248,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 48, 48);
  ctx.fillStyle = '#FFF6DA';
  ctx.beginPath();
  ctx.moveTo(24, 6);
  ctx.quadraticCurveTo(26, 22, 42, 24);
  ctx.quadraticCurveTo(26, 26, 24, 42);
  ctx.quadraticCurveTo(22, 26, 6, 24);
  ctx.quadraticCurveTo(22, 22, 24, 6);
  ctx.fill();
  return c;
}

function ripple(): HTMLCanvasElement {
  const c = makeCanvas(200, 200);
  const ctx = ctx2d(c);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(100, 100, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(100, 100, 74, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

function koi(): HTMLCanvasElement {
  const c = makeCanvas(120, 60);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#FFF4E6';
  ctx.beginPath();
  ctx.moveTo(100, 30);
  ctx.bezierCurveTo(90, 8, 40, 10, 22, 30);
  ctx.bezierCurveTo(40, 50, 90, 52, 100, 30);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, 30);
  ctx.lineTo(4, 14);
  ctx.quadraticCurveTo(12, 30, 4, 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.apricot;
  for (const [x, y, r] of [[78, 24, 9], [58, 34, 8], [40, 26, 6]] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5B4B4F';
  ctx.beginPath();
  ctx.arc(92, 26, 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

function lotus(): HTMLCanvasElement {
  const c = makeCanvas(80, 60);
  const ctx = ctx2d(c);
  for (const [a, s] of [[-0.9, 0.8], [0.9, 0.8], [-0.45, 0.95], [0.45, 0.95], [0, 1]] as const) {
    ctx.save();
    ctx.translate(40, 50);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, -40, 0, 0);
    g.addColorStop(0, PALETTE.blush);
    g.addColorStop(1, '#FFF6F0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -22 * s, 10, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  return c;
}

/** Frosty edges for the Morning Frost moment — clear in the middle. */
function frost(rng: () => number): HTMLCanvasElement {
  const W = 1600;
  const H = 900;
  const c = makeCanvas(W, H);
  const ctx = ctx2d(c);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(235,242,250,0)');
  g.addColorStop(0.6, 'rgba(225,234,246,0.55)');
  g.addColorStop(1, 'rgba(240,245,252,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // crystal branches creeping from the edges
  ctx.lineCap = 'round';
  const branch = (x: number, y: number, ang: number, len: number, depth: number) => {
    if (depth <= 0 || len < 6) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + depth * 0.1})`;
    ctx.lineWidth = depth * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    branch(x2, y2, ang + rand(rng, -0.25, 0.25), len * 0.72, depth - 1);
    branch(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, ang + 0.9, len * 0.45, depth - 2);
    branch(x + (x2 - x) * 0.5, y + (y2 - y) * 0.5, ang - 0.9, len * 0.45, depth - 2);
  };
  for (let i = 0; i < 40; i++) {
    const edge = i % 4;
    const t = rng();
    const [x, y, a] =
      edge === 0 ? [t * W, 0, Math.PI / 2] : edge === 1 ? [t * W, H, -Math.PI / 2] : edge === 2 ? [0, t * H, 0] : [W, t * H, Math.PI];
    branch(x, y, a + rand(rng, -0.5, 0.5), rand(rng, 50, 110), 5);
  }
  return c;
}
