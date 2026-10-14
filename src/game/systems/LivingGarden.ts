import Phaser from 'phaser';
import { BUTTERFLY_COLORS, FLOWER_COLORS } from '../../art/textures';
import { GAME_H, GAME_W, type InputHub } from '../../input/inputHub';
import type { Drifters } from '../effects/Drifters';

interface FlowerSpot {
  x: number;
  y: number;
  scale: number;
  color: number;
  stem: Phaser.GameObjects.Image;
  head: Phaser.GameObjects.Image;
  bloomed: boolean;
  lean: number;
  phase: number;
}

interface Butterfly {
  wings: Phaser.GameObjects.Image;
  tx: number;
  ty: number;
  speed: number;
  phase: number;
}

/**
 * The garden that grows with play: sleepy buds wake up and bloom as fruit is sliced,
 * flowers lean toward the child's hands, and butterflies arrive after combos.
 * All changes are driven by real gameplay progress.
 */
export class LivingGarden {
  private spots: FlowerSpot[] = [];
  private butterflies: Butterfly[] = [];
  bloomedCount = 0;

  constructor(
    private scene: Phaser.Scene,
    private drifters: Drifters,
    private reducedMotion: boolean,
    /** where flowers grow; defaults to a row along the bottom of the screen */
    places?: { x: number; y: number; scale?: number }[],
  ) {
    const count = 9;
    const spots: { x: number; y: number; scale?: number }[] =
      places ??
      Array.from({ length: count }, (_, i) => ({
        x: 150 + ((GAME_W - 300) * i) / (count - 1) + Phaser.Math.Between(-30, 30),
        y: GAME_H + 6 - Phaser.Math.Between(0, 26),
      }));
    spots.forEach((p, i) => {
      const { x, y } = p;
      const scale = (p.scale ?? 1) * Phaser.Math.FloatBetween(0.72, 0.95);
      const color = i % FLOWER_COLORS.length;
      const stem = scene.add.image(x, y, 'stem').setOrigin(0.5, 1).setScale(scale).setDepth(5);
      const head = scene.add.image(x, y - 150 * scale, `bud-${color}`).setScale(scale * 0.85).setDepth(6);
      this.spots.push({ x, y, scale, color, stem, head, bloomed: false, lean: 0, phase: Math.random() * 6 });
    });
  }

  get allBloomed(): boolean {
    return this.spots.every((s) => s.bloomed);
  }

  /** Wake the next sleepy bud. Returns true if a flower bloomed. */
  bloomNext(): boolean {
    const buds = this.spots.filter((s) => !s.bloomed);
    if (!buds.length) return false;
    const s = Phaser.Utils.Array.GetRandom(buds) as FlowerSpot;
    s.bloomed = true;
    this.bloomedCount++;
    const target = s.scale;
    this.scene.tweens.add({
      targets: s.head,
      scale: s.scale * 0.5,
      duration: 160,
      ease: 'Sine.easeIn',
      onComplete: () => {
        s.head.setTexture(`bloom-${s.color}`);
        this.scene.tweens.add({ targets: s.head, scale: target, duration: 650, ease: 'Back.easeOut' });
      },
    });
    if (!this.reducedMotion) {
      for (let k = 0; k < 5; k++) {
        const p = this.scene.add.image(s.head.x, s.head.y, `petal-${s.color}`).setDepth(13).setScale(0.7);
        this.drifters.add(p, {
          vx: Phaser.Math.FloatBetween(-60, 60),
          vy: Phaser.Math.FloatBetween(-150, -70),
          gravity: 80,
          sway: 30,
          spin: Phaser.Math.FloatBetween(-2, 2),
          life: 2.2,
          fadeFrom: 0.4,
        });
      }
    }
    return true;
  }

  /** Flowers near a slice give a happy little wiggle. */
  wiggleNear(x: number): void {
    for (const s of this.spots) {
      if (Math.abs(s.x - x) < 240 && !this.scene.tweens.isTweening(s.head)) {
        this.scene.tweens.add({ targets: s.head, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => s.head.setAngle(0) });
      }
    }
  }

  spawnButterfly(x?: number, y?: number): void {
    if (this.butterflies.length >= 7) return;
    const sx = x ?? (Math.random() < 0.5 ? -40 : GAME_W + 40);
    const sy = y ?? Phaser.Math.Between(560, 760);
    const wings = this.scene.add
      .image(sx, sy, `wing-${Phaser.Math.Between(0, BUTTERFLY_COLORS.length - 1)}`)
      .setDepth(7)
      .setScale(0.7);
    const b: Butterfly = { wings, tx: sx, ty: sy, speed: Phaser.Math.Between(70, 110), phase: Math.random() * 10 };
    this.pickTarget(b);
    this.butterflies.push(b);
  }

  private pickTarget(b: Butterfly): void {
    // stay around the edges so the centre (fruit + child) stays clear
    const edge = Phaser.Math.Between(0, 2);
    if (edge === 0) [b.tx, b.ty] = [Phaser.Math.Between(60, 320), Phaser.Math.Between(260, 800)];
    else if (edge === 1) [b.tx, b.ty] = [Phaser.Math.Between(GAME_W - 320, GAME_W - 60), Phaser.Math.Between(260, 800)];
    else [b.tx, b.ty] = [Phaser.Math.Between(200, GAME_W - 200), Phaser.Math.Between(700, 820)];
  }

  update(dt: number, timeS: number, hub: InputHub): void {
    // flowers sway and lean toward the nearest visible hand — the world notices the child
    const hands = hub.hands.filter((h) => h.visible);
    for (const s of this.spots) {
      let target = Math.sin(timeS * 1.3 + s.phase) * 0.04;
      if (hands.length) {
        const near = hands.reduce((a, h) => (Math.abs(h.x - s.x) < Math.abs(a.x - s.x) ? h : a));
        const dx = near.x - s.x;
        if (Math.abs(dx) < 500) target += Phaser.Math.Clamp(dx / 1500, -0.18, 0.18) * (s.bloomed ? 1 : 0.5);
      }
      s.lean += (target - s.lean) * Math.min(1, dt * 3);
      s.stem.rotation = s.lean * 0.6;
      const len = 150 * s.scale;
      s.head.x = s.x + Math.sin(s.lean * 0.6) * len;
      s.head.y = s.y - Math.cos(s.lean * 0.6) * len;
      if (!this.scene.tweens.isTweening(s.head)) s.head.rotation = s.lean;
    }

    for (const b of this.butterflies) {
      const dx = b.tx - b.wings.x;
      const dy = b.ty - b.wings.y;
      const d = Math.hypot(dx, dy);
      if (d < 20) this.pickTarget(b);
      const wob = Math.sin(timeS * 3 + b.phase) * 30;
      b.wings.x += (dx / (d || 1)) * b.speed * dt;
      b.wings.y += ((dy / (d || 1)) * b.speed + wob) * dt;
      b.wings.scaleX = 0.7 * (0.3 + 0.7 * Math.abs(Math.sin(timeS * 9 + b.phase)));
      b.wings.rotation = Phaser.Math.Clamp(dx / 600, -0.4, 0.4);
    }
  }
}
