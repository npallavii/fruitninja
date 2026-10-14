// Cute watercolor fruit characters, drawn with Canvas 2D so the same art is used
// by both the Phaser game (as textures) and the React menus (as images).
import { PALETTE, rgba } from './palette';
import { ctx2d, makeCanvas, mulberry32, rand } from './watercolor';

export type FruitKind = 'strawberry' | 'peach' | 'orange' | 'watermelon' | 'banana' | 'grapes';
export const FRUIT_KINDS: FruitKind[] = ['strawberry', 'peach', 'orange', 'watermelon', 'banana', 'grapes'];

export const FRUIT_CANVAS = 220;
const R = 78; // body radius in canvas px
const CX = FRUIT_CANVAS / 2;
const CY = FRUIT_CANVAS / 2 + 8;

interface FruitSpec {
  light: string;
  dark: string;
  /** collision radius as a fraction of R */
  hit: number;
  /** display scale in game */
  scale: number;
  /** colour of the juice splash */
  juice: string;
  flesh: string;
  fleshCore: string;
  face: { y: number; s: number; open: boolean };
}

export const FRUIT_SPECS: Record<FruitKind, FruitSpec> = {
  strawberry: { light: '#F8C3C6', dark: '#E07F8C', hit: 0.92, scale: 0.92, juice: PALETTE.blush, flesh: '#F6A9B3', fleshCore: '#FCE6E4', face: { y: 0.1, s: 0.9, open: false } },
  peach: { light: '#FCDDBC', dark: '#EE9E9C', hit: 0.95, scale: 1.0, juice: PALETTE.apricot, flesh: '#FBD49E', fleshCore: '#FDE8C6', face: { y: 0.12, s: 1, open: false } },
  orange: { light: '#FBD6A6', dark: '#EE9D5B', hit: 0.95, scale: 1.0, juice: PALETTE.apricot, flesh: '#F9BE79', fleshCore: '#FDE3BC', face: { y: 0.05, s: 1, open: true } },
  watermelon: { light: '#CFE3AE', dark: '#83AC6C', hit: 1.0, scale: 1.18, juice: PALETTE.blush, flesh: '#F49AA6', fleshCore: '#F8B9C0', face: { y: 0.05, s: 1, open: true } },
  banana: { light: '#F9E9B5', dark: '#E8C268', hit: 0.85, scale: 1.05, juice: PALETTE.honey, flesh: '#FBF0CF', fleshCore: '#FFF8E4', face: { y: 0.05, s: 0.72, open: false } },
  grapes: { light: '#DCBDD5', dark: '#A27597', hit: 0.92, scale: 1.0, juice: PALETTE.plum, flesh: '#E4EDC7', fleshCore: '#F4F7E2', face: { y: -0.05, s: 0.82, open: false } },
};

// ---------------------------------------------------------------- shapes

function bodyPath(kind: FruitKind): Path2D {
  const p = new Path2D();
  const X = (x: number) => CX + x * R;
  const Y = (y: number) => CY + y * R;
  switch (kind) {
    case 'peach':
      p.moveTo(X(0), Y(-0.72));
      p.bezierCurveTo(X(0.35), Y(-1.02), X(1.0), Y(-0.78), X(0.98), Y(-0.05));
      p.bezierCurveTo(X(0.96), Y(0.62), X(0.5), Y(0.98), X(0), Y(0.98));
      p.bezierCurveTo(X(-0.5), Y(0.98), X(-0.96), Y(0.62), X(-0.98), Y(-0.05));
      p.bezierCurveTo(X(-1.0), Y(-0.78), X(-0.35), Y(-1.02), X(0), Y(-0.72));
      break;
    case 'strawberry':
      p.moveTo(X(0), Y(-0.8));
      p.bezierCurveTo(X(0.62), Y(-0.98), X(1.02), Y(-0.55), X(0.92), Y(-0.05));
      p.bezierCurveTo(X(0.82), Y(0.5), X(0.32), Y(0.95), X(0), Y(1.0));
      p.bezierCurveTo(X(-0.32), Y(0.95), X(-0.82), Y(0.5), X(-0.92), Y(-0.05));
      p.bezierCurveTo(X(-1.02), Y(-0.55), X(-0.62), Y(-0.98), X(0), Y(-0.8));
      break;
    case 'watermelon':
      p.ellipse(CX, CY, R * 1.0, R * 0.86, 0, 0, Math.PI * 2);
      break;
    case 'banana':
      p.moveTo(X(-0.92), Y(-0.48));
      p.quadraticCurveTo(X(0), Y(1.2), X(0.96), Y(-0.42));
      p.quadraticCurveTo(X(0.98), Y(-0.6), X(0.84), Y(-0.58));
      p.quadraticCurveTo(X(0), Y(0.18), X(-0.74), Y(-0.66));
      p.quadraticCurveTo(X(-0.92), Y(-0.66), X(-0.92), Y(-0.48));
      break;
    case 'grapes':
      for (const [gx, gy] of GRAPES) p.arc(X(gx), Y(gy), R * 0.34, 0, Math.PI * 2), p.closePath();
      break;
    default:
      p.arc(CX, CY, R * 0.95, 0, Math.PI * 2);
  }
  return p;
}

const GRAPES: [number, number][] = [
  [-0.56, -0.42],
  [0, -0.48],
  [0.56, -0.42],
  [-0.3, 0.06],
  [0.3, 0.06],
  [-0.62, 0.12],
  [0.62, 0.12],
  [0, 0.52],
];

// ---------------------------------------------------------------- painting

function paintBody(ctx: CanvasRenderingContext2D, kind: FruitKind): void {
  const spec = FRUIT_SPECS[kind];
  const path = bodyPath(kind);
  const rng = mulberry32(kind.length * 97);

  if (kind === 'grapes') {
    // individually shaded grapes, back to front
    GRAPES.slice().sort((a, b) => a[1] - b[1]).forEach(([gx, gy], i) => {
      const x = CX + gx * R;
      const y = CY + gy * R;
      const r = R * 0.34;
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, i % 2 ? '#E6CCE0' : spec.light);
      g.addColorStop(1, spec.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(spec.dark, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  // base gradient
  const g = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.45, R * 0.1, CX, CY, R * 1.1);
  g.addColorStop(0, spec.light);
  g.addColorStop(0.55, spec.light);
  g.addColorStop(1, spec.dark);
  ctx.fillStyle = g;
  ctx.fill(path);

  ctx.save();
  ctx.clip(path);
  // watercolour pooling toward the lower right
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = rgba(spec.dark, 0.08);
    ctx.beginPath();
    ctx.ellipse(CX + R * rand(rng, 0.1, 0.6), CY + R * rand(rng, 0.2, 0.7), R * rand(rng, 0.4, 0.8), R * rand(rng, 0.3, 0.6), rand(rng, 0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === 'watermelon') {
    ctx.strokeStyle = rgba('#5F8A58', 0.5);
    ctx.lineCap = 'round';
    for (let s = -4; s <= 4; s++) {
      ctx.lineWidth = R * 0.11;
      ctx.beginPath();
      const x0 = CX + s * R * 0.24;
      ctx.moveTo(x0, CY - R);
      for (let y = -1; y <= 1.01; y += 0.1) {
        ctx.lineTo(x0 + Math.sin(y * 7 + s) * R * 0.04 + s * R * 0.05 * (1 - Math.abs(y)), CY + y * R);
      }
      ctx.stroke();
    }
  }
  if (kind === 'orange') {
    ctx.fillStyle = rgba(spec.dark, 0.18);
    for (let i = 0; i < 40; i++) {
      const a = rand(rng, 0, Math.PI * 2);
      const d = Math.sqrt(rng()) * R * 0.9;
      ctx.beginPath();
      ctx.arc(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (kind === 'strawberry') {
    for (let row = 0; row < 6; row++) {
      for (let col = -3; col <= 3; col++) {
        const x = CX + (col + (row % 2) * 0.5) * R * 0.26;
        const y = CY - R * 0.45 + row * R * 0.26;
        if (row === 1 && Math.abs(col) <= 1) continue; // keep the face clean
        if (row === 2 && Math.abs(col) <= 1) continue;
        ctx.fillStyle = rgba('#F7E3A1', 0.95);
        ctx.beginPath();
        ctx.ellipse(x, y, 2.6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (kind === 'peach') {
    ctx.strokeStyle = rgba(spec.dark, 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX, CY - R * 0.7);
    ctx.quadraticCurveTo(CX + R * 0.28, CY - R * 0.2, CX + R * 0.12, CY + R * 0.5);
    ctx.stroke();
  }
  // wet edge
  ctx.strokeStyle = rgba(spec.dark, 0.18);
  ctx.lineWidth = 14;
  ctx.stroke(path);
  ctx.restore();

  ctx.strokeStyle = rgba(spec.dark, 0.6);
  ctx.lineWidth = 2.5;
  ctx.stroke(path);

  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  if (kind === 'banana') ctx.ellipse(CX - R * 0.45, CY - R * 0.12, R * 0.22, R * 0.08, 0.7, 0, Math.PI * 2);
  else ctx.ellipse(CX - R * 0.42, CY - R * 0.42, R * 0.26, R * 0.15, -0.7, 0, Math.PI * 2);
  ctx.fill();
}

function paintTop(ctx: CanvasRenderingContext2D, kind: FruitKind): void {
  const leaf = (x: number, y: number, len: number, ang: number, color: string = PALETTE.matcha) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
    ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
    ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.leafDeep, 0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.1, 0);
    ctx.lineTo(len * 0.85, 0);
    ctx.stroke();
    ctx.restore();
  };
  const stem = (x: number, y: number, h: number, bend = 0.3) => {
    ctx.strokeStyle = PALETTE.bark;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + h * bend, y - h * 0.6, x + h * bend * 0.5, y - h);
    ctx.stroke();
  };
  switch (kind) {
    case 'peach':
      stem(CX, CY - R * 0.72, 16);
      leaf(CX + 2, CY - R * 0.82, 44, -0.5);
      leaf(CX - 2, CY - R * 0.82, 36, Math.PI + 0.45, '#B9D29B');
      break;
    case 'orange':
      stem(CX, CY - R * 0.92, 12);
      leaf(CX + 4, CY - R * 0.98, 40, -0.35);
      break;
    case 'strawberry':
      // a fanned crown of leaves resting over the shoulders of the berry
      for (let i = 0; i < 6; i++) leaf(CX, CY - R * 0.78, 34, -0.35 + (i / 5) * (Math.PI + 0.7), i % 2 ? PALETTE.matcha : '#97BC7D');
      stem(CX, CY - R * 0.8, 14, 0.15);
      break;
    case 'watermelon':
      stem(CX, CY - R * 0.84, 14);
      leaf(CX + 4, CY - R * 0.92, 34, -0.4);
      break;
    case 'banana':
      ctx.fillStyle = PALETTE.bark;
      ctx.beginPath();
      ctx.ellipse(CX + R * 0.92, CY - R * 0.52, 7, 9, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(CX - R * 0.84, CY - R * 0.6, 6, 8, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'grapes':
      stem(CX, CY - R * 0.72, 22, 0.1);
      leaf(CX + 2, CY - R * 0.85, 48, -0.25);
      break;
  }
}

function paintFace(ctx: CanvasRenderingContext2D, kind: FruitKind): void {
  const { y, s, open } = FRUIT_SPECS[kind].face;
  const fx = CX;
  const fy = CY + y * R;
  const u = R * s;
  // eyes
  for (const side of [-1, 1]) {
    const ex = fx + side * u * 0.3;
    const ey = fy - u * 0.06;
    ctx.fillStyle = '#4A3A40';
    ctx.beginPath();
    ctx.ellipse(ex, ey, u * 0.095, u * 0.125, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex - u * 0.03, ey - u * 0.05, u * 0.038, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + u * 0.035, ey + u * 0.04, u * 0.018, 0, Math.PI * 2);
    ctx.fill();
    // blush
    ctx.fillStyle = 'rgba(236,128,140,0.38)';
    ctx.beginPath();
    ctx.ellipse(fx + side * u * 0.5, fy + u * 0.14, u * 0.13, u * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // mouth
  ctx.strokeStyle = '#4A3A40';
  ctx.lineWidth = Math.max(2, u * 0.04);
  ctx.lineCap = 'round';
  if (open) {
    ctx.fillStyle = '#7A4650';
    ctx.beginPath();
    ctx.moveTo(fx - u * 0.13, fy + u * 0.12);
    ctx.quadraticCurveTo(fx, fy + u * 0.36, fx + u * 0.13, fy + u * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F2A1A8';
    ctx.beginPath();
    ctx.ellipse(fx, fy + u * 0.22, u * 0.065, u * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(fx - u * 0.1, fy + u * 0.12);
    ctx.quadraticCurveTo(fx, fy + u * 0.24, fx + u * 0.1, fy + u * 0.12);
    ctx.stroke();
  }
}

function paintFlesh(ctx: CanvasRenderingContext2D, kind: FruitKind): void {
  const spec = FRUIT_SPECS[kind];
  const halfW = kind === 'banana' ? R * 0.42 : kind === 'watermelon' ? R * 1.0 : R * 0.93;
  const fx = kind === 'banana' ? CX : CX;
  const fy = kind === 'banana' ? CY + R * 0.18 : CY;
  const ry = kind === 'banana' ? R * 0.18 : R * 0.24;
  if (kind === 'watermelon') {
    ctx.fillStyle = '#6E9665';
    ctx.beginPath();
    ctx.ellipse(fx, fy, halfW, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F6F1D8';
    ctx.beginPath();
    ctx.ellipse(fx, fy, halfW * 0.93, ry * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(fx, fy, 1, fx, fy, halfW);
  g.addColorStop(0, spec.fleshCore);
  g.addColorStop(1, spec.flesh);
  ctx.fillStyle = g;
  ctx.beginPath();
  const inset = kind === 'watermelon' ? 0.88 : 1;
  ctx.ellipse(fx, fy, halfW * inset, ry * (kind === 'watermelon' ? 0.7 : 1), 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'orange') {
    ctx.strokeStyle = 'rgba(255,248,230,0.85)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(a) * halfW * 0.85, fy + Math.sin(a) * ry * 0.85);
      ctx.stroke();
    }
  }
  if (kind === 'peach') {
    ctx.fillStyle = '#B07A5E';
    ctx.beginPath();
    ctx.ellipse(fx, fy, R * 0.28, ry * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === 'watermelon') {
    ctx.fillStyle = '#5E4652';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(fx + i * R * 0.24, fy + (i % 2) * ry * 0.25, 3, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (kind === 'strawberry' || kind === 'banana' || kind === 'grapes') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, halfW * 0.35, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = rgba(spec.dark, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(fx, fy, halfW, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------- public API

export function drawFruit(kind: FruitKind, withFace = true): HTMLCanvasElement {
  const c = makeCanvas(FRUIT_CANVAS, FRUIT_CANVAS);
  const ctx = ctx2d(c);
  // soft shadow-glow so the fruit reads well over a camera image
  ctx.save();
  ctx.shadowColor = 'rgba(120, 90, 80, 0.25)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill(bodyPath(kind));
  ctx.restore();
  paintBody(ctx, kind);
  paintTop(ctx, kind);
  if (withFace) paintFace(ctx, kind);
  return c;
}

/** One half of a sliced fruit. The cut is horizontal in texture space; the game rotates it. */
export function drawFruitHalf(kind: FruitKind, part: 'top' | 'bottom'): HTMLCanvasElement {
  const whole = drawFruit(kind, false);
  const c = makeCanvas(FRUIT_CANVAS, FRUIT_CANVAS);
  const ctx = ctx2d(c);
  const cutY = kind === 'banana' ? CY + R * 0.18 : CY;
  ctx.save();
  ctx.beginPath();
  if (part === 'top') ctx.rect(0, 0, FRUIT_CANVAS, cutY);
  else ctx.rect(0, cutY, FRUIT_CANVAS, FRUIT_CANVAS - cutY);
  ctx.clip();
  ctx.drawImage(whole, 0, 0);
  ctx.restore();
  // the juicy cut face, only on the side of the cut that belongs to this half
  ctx.save();
  ctx.beginPath();
  if (part === 'top') ctx.rect(0, cutY - R * 0.3, FRUIT_CANVAS, R * 0.6);
  else ctx.rect(0, cutY - R * 0.3, FRUIT_CANVAS, R * 0.6);
  ctx.clip();
  paintFlesh(ctx, kind);
  ctx.restore();
  return c;
}

/** The "Morning Frost" dewdrop crystal. */
export function drawCrystal(): HTMLCanvasElement {
  const S = FRUIT_CANVAS;
  const c = makeCanvas(S, S);
  const ctx = ctx2d(c);
  const cx = S / 2;
  const cy = S / 2 + 6;
  const g0 = ctx.createRadialGradient(cx, cy, 10, cx, cy, S / 2);
  g0.addColorStop(0, 'rgba(220,235,250,0.7)');
  g0.addColorStop(1, 'rgba(220,235,250,0)');
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, S, S);
  const p = new Path2D();
  p.moveTo(cx, cy - 80);
  p.bezierCurveTo(cx + 22, cy - 42, cx + 62, cy - 6, cx + 60, cy + 30);
  p.bezierCurveTo(cx + 58, cy + 66, cx + 30, cy + 82, cx, cy + 82);
  p.bezierCurveTo(cx - 30, cy + 82, cx - 58, cy + 66, cx - 60, cy + 30);
  p.bezierCurveTo(cx - 62, cy - 6, cx - 22, cy - 42, cx, cy - 80);
  const g = ctx.createLinearGradient(cx - 60, cy - 80, cx + 60, cy + 80);
  g.addColorStop(0, 'rgba(250,252,255,0.95)');
  g.addColorStop(0.45, 'rgba(213,199,228,0.85)');
  g.addColorStop(1, 'rgba(169,195,214,0.9)');
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  const facets: [number, number, number, number][] = [
    [cx, cy - 80, cx - 20, cy + 10],
    [cx, cy - 80, cx + 24, cy + 6],
    [cx - 20, cy + 10, cx + 24, cy + 6],
    [cx - 20, cy + 10, cx - 58, cy + 34],
    [cx + 24, cy + 6, cx + 58, cy + 30],
    [cx - 20, cy + 10, cx, cy + 82],
    [cx + 24, cy + 6, cx, cy + 82],
  ];
  for (const [a, b, d, e] of facets) {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(d, e);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(129,150,181,0.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke(p);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx - 24, cy - 8, 9, 18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // sleepy smile
  ctx.strokeStyle = '#6B6280';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * 18, cy + 30, 7, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy + 44, 6, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  return c;
}

const fruitUrls = new Map<string, string>();
export function fruitDataUrl(kind: FruitKind): string {
  if (!fruitUrls.has(kind)) fruitUrls.set(kind, drawFruit(kind).toDataURL('image/png'));
  return fruitUrls.get(kind)!;
}
