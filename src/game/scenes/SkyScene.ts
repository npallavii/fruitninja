import Phaser from 'phaser';
import { RAINBOW, hexToNumber } from '../../art/palette';
import { LANTERN_COLORS, splashIndexFor } from '../../art/textures';
import { audio } from '../../audio/audio';
import { GAME_H, GAME_W } from '../../input/inputHub';
import { petalShower } from '../effects/sliceFx';
import type { GameServices } from '../services';
import { LevelScene } from './LevelScene';

const POINTS_LANTERN = 10;
const POINTS_HIGH = 5; // extra for reaching up high
const POINTS_STAR = 30;
const POINTS_BRIDGE = 50;
const HIGH_LINE = 330;
/** a jump catches every berry above this line that is near the child */
const JUMP_LINE = 470;
const JUMP_REACH = 280;
const POINTS_JUMP = 15;
const BRIDGE_STEPS = 14;
// rainbow bridge from the left island to the right island (matches the painted background)
const BRIDGE_A = { x: 300, y: 540 };
const BRIDGE_B = { x: 1240, y: 418 };
const BRIDGE_C = { x: 770, y: 110 };

interface Lantern {
  img: Phaser.GameObjects.Image;
  color: number;
  x0: number;
  vx: number;
  vy: number;
  age: number;
  phase: number;
  r: number;
  star: boolean;
  popped: boolean;
}

/** Flowers grow on the three floating islands. */
const ISLAND_FLOWERS = [
  { x: 225, y: 556, scale: 0.6 },
  { x: 290, y: 550, scale: 0.65 },
  { x: 355, y: 556, scale: 0.6 },
  { x: 1195, y: 430, scale: 0.55 },
  { x: 1250, y: 424, scale: 0.6 },
  { x: 1305, y: 430, scale: 0.55 },
  { x: 725, y: 714, scale: 0.5 },
  { x: 770, y: 708, scale: 0.55 },
  { x: 815, y: 714, scale: 0.5 },
];

/** Level 3 — The Cloudberry Sky: cloudberries fall from the clouds; reach up or jump to catch them. */
export class SkyScene extends LevelScene {
  private lanterns: Lantern[] = [];
  private bridge!: Phaser.GameObjects.Graphics;
  private bridgeSteps = 0;
  private bridgeBusy = false;
  private nextSpawnMs = 800;
  private nextStarMs = 12000;
  private lastJump = 0;
  private lastJumpReward = 0;

  constructor(services: GameServices) {
    super(services, {
      key: 'sky',
      companion: 'misty',
      intro: {
        camera: 'Hello, I’m Misty! Cloudberries are falling from my clouds. Reach up, or jump, to catch them!',
        mouse: 'Hello, I’m Misty! Cloudberries are falling from my clouds. Touch them to catch them!',
      },
      cheers: ['Pop! What a catch!', 'You reached so high!', 'The rainbow is growing!', 'Lovely jumping!'],
      successesPerBloom: 3,
      gardenPlaces: ISLAND_FLOWERS,
    });
  }

  protected setupLevel(): void {
    this.lanterns = [];
    this.bridge = this.add.graphics().setDepth(3);
    this.bridgeSteps = 0;
    this.bridgeBusy = false;
    this.nextSpawnMs = 800;
    this.nextStarMs = 12000;
    this.lastJump = this.hub.jumpCount;
    if (this.services.mode === 'mouse') {
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        for (const l of this.lanterns) if (!l.popped && Phaser.Math.Distance.Between(p.x, p.y, l.img.x, l.img.y) < l.r + 30) this.pop(l, false);
      });
    }
  }

  protected updateLevel(_dt: number, worldDt: number, now: number, canSpawn: boolean): void {
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i];
      if (l.popped) continue;
      l.age += worldDt;
      if (l.star) {
        l.img.x += l.vx * worldDt;
        l.img.y = l.x0 + Math.sin(l.age * 1.6) * 18; // x0 holds the star's base height
        l.img.rotation = Math.sin(l.age * 2) * 0.15;
      } else {
        l.img.y += l.vy * worldDt; // drifting down under its cloud parachute
        l.img.x = l.x0 + Math.sin(l.age * 1.1 + l.phase) * 35;
        l.img.rotation = Math.sin(l.age * 1.1 + l.phase) * 0.08;
      }
      const gone = l.star ? l.img.x < -160 || l.img.x > GAME_W + 160 : l.img.y > GAME_H + 120;
      if (gone) {
        l.img.destroy();
        this.lanterns.splice(i, 1);
      }
    }

    if (canSpawn && this.playMs >= this.nextSpawnMs) this.spawnLanterns();
    if (canSpawn && this.playMs >= this.nextStarMs && !this.lanterns.some((l) => l.star)) this.spawnStar();

    if (this.ending) return;
    // reach: any hand touching a lantern pops it (no fast swipe needed)
    for (const h of this.hub.hands) {
      if (!h.visible) continue;
      for (const l of this.lanterns) {
        if (!l.popped && Phaser.Math.Distance.Between(h.x, h.y, l.img.x, l.img.y) < l.r + 26) this.pop(l, false);
      }
    }
    // jump: catches the golden star and every high cloudberry near the child
    if (this.hub.jumpCount > this.lastJump) {
      this.lastJump = this.hub.jumpCount;
      const star = this.lanterns.find((l) => l.star && !l.popped);
      const high = this.lanterns.filter(
        (l) => !l.star && !l.popped && l.img.y > 40 && l.img.y < JUMP_LINE && Math.abs(l.img.x - this.hub.hipX) < JUMP_REACH,
      );
      if (star) this.pop(star, true);
      high.forEach((l) => this.pop(l, true));
      if (high.length >= 2) this.say('Wow! A jump catch!', 'cheer', true);
      if (!star && !high.length && now - this.lastJumpReward > 2500) {
        this.lastJumpReward = now;
        this.bonus(this.hub.hipX, this.hub.hipY - 200, 5, 'Boing! +5');
        audio.pop(0.9);
      }
    }
  }

  protected clearLevel(): void {
    this.lanterns.forEach((l) => l.img.destroy());
    this.lanterns = [];
  }

  // ------------------------------------------------------------------ lanterns

  private spawnLanterns(): void {
    const p = this.progress;
    const count = p > 0.5 && Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 500, () => {
        if (!this.running) return;
        const color = Phaser.Math.Between(0, LANTERN_COLORS.length - 1);
        const x0 = Phaser.Math.Between(260, GAME_W - 260);
        const img = this.add.image(x0, -110, `lantern-${color}`).setDepth(10).setScale(0.85);
        this.lanterns.push({
          img,
          color,
          x0,
          vx: 0,
          vy: Phaser.Math.Between(62, 92) * (1 + p * 0.25),
          age: 0,
          phase: Math.random() * 6,
          r: 50,
          star: false,
          popped: false,
        });
      });
    }
    this.nextSpawnMs = this.playMs + Phaser.Math.Linear(1600, 1050, p) + Phaser.Math.Between(-150, 150);
  }

  private spawnStar(): void {
    const fromLeft = Math.random() < 0.5;
    const baseY = Phaser.Math.Between(120, 180);
    const img = this.add.image(fromLeft ? -120 : GAME_W + 120, baseY, 'lantern-star').setDepth(11).setScale(0.95);
    this.lanterns.push({ img, color: 2, x0: baseY, vx: fromLeft ? 105 : -105, vy: 0, age: 0, phase: 0, r: 60, star: true, popped: false });
    audio.chimes(5, 89);
    this.say(
      this.hub.mode === 'pose' ? 'A golden star! Jump, or reach up high to catch it!' : 'A golden star! Can you catch it?',
      'cheer',
      true,
    );
    this.nextStarMs = this.playMs + 15000;
  }

  private pop(l: Lantern, byJump: boolean): void {
    l.popped = true;
    const { x, y } = l.img;
    const height = 1 - y / GAME_H;
    audio.pop(height);
    if (l.star) audio.chimes(6, 86);

    // soft glow burst + sparkles and petals drifting down
    const tint = hexToNumber(l.star ? '#F4D99A' : LANTERN_COLORS[l.color]);
    const glow = this.add.image(x, y, 'glow').setDepth(9).setTint(tint).setScale(0.6).setAlpha(0.9);
    this.tweens.add({ targets: glow, scale: 2.2, alpha: 0, duration: 800, ease: 'Sine.easeOut', onComplete: () => glow.destroy() });
    this.tweens.add({ targets: l.img, scale: l.img.scale * 1.25, alpha: 0, duration: 260, ease: 'Sine.easeOut', onComplete: () => l.img.destroy() });
    const bits = this.reducedMotion ? 3 : l.star ? 14 : 7;
    for (let k = 0; k < bits; k++) {
      const p = this.add
        .image(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 20), k % 2 ? 'sparkle' : `petal-${k % 5}`)
        .setDepth(12)
        .setScale(Phaser.Math.FloatBetween(0.6, 1));
      this.drifters.add(p, {
        vx: Phaser.Math.FloatBetween(-80, 80),
        vy: Phaser.Math.FloatBetween(-90, 10),
        gravity: 45,
        drag: 0.3,
        sway: 30,
        spin: Phaser.Math.FloatBetween(-2, 2),
        life: 3,
        fadeFrom: 0.5,
      });
    }
    this.services.tapestry.stain(x, y, splashIndexFor(LANTERN_COLORS[l.color] ?? '#F4D99A'), 0.7, 0.25);
    this.lanterns = this.lanterns.filter((o) => o !== l);

    if (l.star) {
      this.success(x, y + 40, POINTS_STAR, byJump ? `Big jump! +${POINTS_STAR}` : `Star catch! +${POINTS_STAR}`);
      this.say(byJump ? 'What a big jump! You caught the star!' : 'You caught the golden star!', 'cheer', true);
      this.garden.spawnButterfly(x, y);
    } else if (byJump) {
      this.success(x, y + 30, POINTS_JUMP, `Jump catch! +${POINTS_JUMP}`);
    } else if (y < HIGH_LINE) {
      this.success(x, y + 30, POINTS_LANTERN + POINTS_HIGH, `Reach high! +${POINTS_LANTERN + POINTS_HIGH}`);
    } else {
      this.success(x, y + 30, POINTS_LANTERN);
    }
    this.growBridge();
  }

  // ------------------------------------------------------------------ rainbow bridge

  private growBridge(): void {
    if (this.bridgeBusy) return;
    this.bridgeSteps++;
    this.drawBridge(this.bridgeSteps / BRIDGE_STEPS);
    if (this.bridgeSteps >= BRIDGE_STEPS) this.completeBridge();
  }

  private drawBridge(progress: number): void {
    const g = this.bridge;
    g.clear();
    if (progress <= 0) return;
    const pointAt = (t: number) => {
      const u = 1 - t;
      return {
        x: u * u * BRIDGE_A.x + 2 * u * t * BRIDGE_C.x + t * t * BRIDGE_B.x,
        y: u * u * BRIDGE_A.y + 2 * u * t * BRIDGE_C.y + t * t * BRIDGE_B.y,
      };
    };
    const steps = Math.max(2, Math.round(48 * progress));
    RAINBOW.forEach((c, i) => {
      const off = (i - (RAINBOW.length - 1) / 2) * 9;
      g.lineStyle(10, hexToNumber(c), 0.6);
      g.beginPath();
      for (let k = 0; k <= steps; k++) {
        const t = (k / steps) * progress;
        const p = pointAt(t);
        const q = pointAt(Math.min(1, t + 0.01));
        const ang = Math.atan2(q.y - p.y, q.x - p.x) - Math.PI / 2;
        const x = p.x + Math.cos(ang) * off;
        const y = p.y + Math.sin(ang) * off;
        if (k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    });
  }

  private completeBridge(): void {
    this.bridgeBusy = true;
    audio.combo(6);
    this.bonus(BRIDGE_C.x, 250, POINTS_BRIDGE, `Rainbow bridge! +${POINTS_BRIDGE}`);
    this.say('The rainbow bridge is finished! Hooray!', 'cheer', true);
    this.garden.spawnButterfly(BRIDGE_A.x, BRIDGE_A.y - 60);
    this.garden.spawnButterfly(BRIDGE_B.x, BRIDGE_B.y - 60);
    if (!this.reducedMotion) petalShower(this, this.drifters, 20);
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: this.bridge,
        alpha: 0,
        duration: 1200,
        onComplete: () => {
          this.bridgeSteps = 0;
          this.drawBridge(0);
          this.bridge.setAlpha(1);
          this.bridgeBusy = false;
        },
      });
    });
  }
}
