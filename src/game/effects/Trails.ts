import Phaser from 'phaser';
import { PALETTE, hexToNumber } from '../../art/palette';
import type { Hand, InputHub, TrailPoint } from '../../input/inputHub';

const HAND_COLORS = [hexToNumber(PALETTE.blush), hexToNumber(PALETTE.lavender)];
const HAND_CORE = [hexToNumber('#E58F9C'), hexToNumber('#9C8CC4')];

/** Chaikin corner-cutting: turns jagged 30fps samples into a smooth brush curve. */
function smooth(pts: TrailPoint[], iterations = 2): TrailPoint[] {
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    if (out.length < 3) return out;
    const next: TrailPoint[] = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i];
      const b = out[i + 1];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25, t: a.t * 0.75 + b.t * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75, t: a.t * 0.25 + b.t * 0.75 });
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

/**
 * Soft calligraphy-brush trails that fade over one second, plus a gentle glowing
 * "magic hand" cursor so the child always knows where their hands are.
 */
export class Trails {
  private g: Phaser.GameObjects.Graphics;
  private cursors: Phaser.GameObjects.Image[];
  private rings: Phaser.GameObjects.Image[];

  constructor(
    private scene: Phaser.Scene,
    private hub: InputHub,
    private sliceSpeed: () => number,
  ) {
    this.g = scene.add.graphics().setDepth(20);
    this.cursors = [0, 1].map((i) =>
      scene.add.image(0, 0, 'glow').setDepth(21).setScale(0.75).setTint(HAND_COLORS[i]).setAlpha(0).setBlendMode(Phaser.BlendModes.NORMAL),
    );
    this.rings = [0, 1].map((i) => scene.add.image(0, 0, 'ripple').setDepth(21).setScale(0.22).setTint(HAND_CORE[i]).setAlpha(0));
  }

  update(nowMs: number): void {
    const g = this.g;
    g.clear();
    const fast = this.sliceSpeed();
    this.hub.hands.forEach((hand, i) => {
      this.drawTrail(hand, i, nowMs, fast);
      const c = this.cursors[i];
      const r = this.rings[i];
      const show = hand.visible && (this.hub.mode === 'pose' || i === 0);
      const target = show ? 0.95 : 0;
      c.alpha += (target - c.alpha) * 0.25;
      r.alpha += ((show ? 0.8 : 0) - r.alpha) * 0.25;
      c.setPosition(hand.x, hand.y);
      r.setPosition(hand.x, hand.y);
      const energized = hand.speed > fast;
      const s = energized ? 0.95 : 0.7;
      c.setScale(c.scale + (s - c.scale) * 0.3);
      r.setScale(0.2 + Math.sin(nowMs / 300 + i) * 0.015);
    });
  }

  private drawTrail(hand: Hand, i: number, nowMs: number, fast: number): void {
    if (hand.trail.length < 2) return;
    const pts = smooth(hand.trail);
    const g = this.g;
    // pass 1: wide soft wash; pass 2: brush core; pass 3: bright inner line
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        const age = (nowMs - b.t) / 1000;
        if (age > 1) continue;
        const life = 1 - age;
        const dt = Math.max(1, b.t - a.t) / 1000;
        const segSpeed = Math.hypot(b.x - a.x, b.y - a.y) / dt;
        const energy = Math.min(1, segSpeed / fast);
        const strength = life * life * (0.25 + 0.75 * energy);
        if (strength < 0.02) continue;
        const w = 10 + 16 * energy;
        if (pass === 0) g.lineStyle(w * 2.8 * life, HAND_COLORS[i], 0.16 * strength);
        else if (pass === 1) g.lineStyle(w * life, HAND_CORE[i], 0.55 * strength);
        else g.lineStyle(w * 0.3 * life, 0xfffaf2, 0.7 * strength);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  /** Rainbow ribbon along the recent path of a hand — the "Calligraphy Flow" reward. */
  ribbon(hand: Hand, nowMs: number, colors: readonly string[]): void {
    const pts = smooth(hand.trail.filter((p) => nowMs - p.t < 700), 3);
    if (pts.length < 3) return;
    const rg = this.scene.add.graphics().setDepth(19);
    colors.forEach((c, ci) => {
      const off = (ci - (colors.length - 1) / 2) * 7;
      rg.lineStyle(8, hexToNumber(c), 0.75);
      rg.beginPath();
      pts.forEach((p, k) => {
        const q = pts[Math.min(k + 1, pts.length - 1)];
        const pr = pts[Math.max(k - 1, 0)];
        const ang = Math.atan2(q.y - pr.y, q.x - pr.x) + Math.PI / 2;
        const x = p.x + Math.cos(ang) * off;
        const y = p.y + Math.sin(ang) * off;
        if (k === 0) rg.moveTo(x, y);
        else rg.lineTo(x, y);
      });
      rg.strokePath();
    });
    this.scene.tweens.add({ targets: rg, alpha: 0, duration: 1400, delay: 300, ease: 'Sine.easeIn', onComplete: () => rg.destroy() });
  }

  hide(): void {
    this.g.clear();
    this.cursors.forEach((c) => c.setAlpha(0));
    this.rings.forEach((r) => r.setAlpha(0));
  }
}
