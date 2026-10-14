import Phaser from 'phaser';
import { FRUIT_KINDS, type FruitKind } from '../../art/fruits';
import { RAINBOW } from '../../art/palette';
import { audio } from '../../audio/audio';
import { GAME_H, GAME_W, type Hand } from '../../input/inputHub';
import { sliceFruitFx } from '../effects/sliceFx';
import { Fruit } from '../entities/Fruit';
import type { GameServices } from '../services';
import { LevelScene } from './LevelScene';

const GRAVITY = 430; // floaty — gives children time to anticipate
const POINTS_FRUIT = 10;
const COMBO_MIN = 3;
const COMBO_GAP_MS = 450;

interface Swipe {
  count: number;
  lastHit: number;
}

/** Level 1 — The Giggle Garden: swish your arms to slice floating fruit. */
export class GiggleGardenScene extends LevelScene {
  private fruits: Fruit[] = [];
  private swipes: Swipe[] = [];
  private nextSpawnMs = 1000;
  private lastKind: FruitKind | null = null;

  constructor(services: GameServices) {
    super(services, {
      key: 'giggle',
      companion: 'pip',
      intro: { camera: 'Swish your arms through the fruit!', mouse: 'Swish across the fruit to slice it!' },
      cheers: ['You helped a flower bloom!', 'Your garden is growing!', 'Lovely movement!', 'Look, a sleepy flower woke up!'],
      successesPerBloom: 3,
    });
  }

  protected setupLevel(): void {
    this.fruits = [];
    this.swipes = [
      { count: 0, lastHit: 0 },
      { count: 0, lastHit: 0 },
    ];
    this.nextSpawnMs = 1000;
    this.lastKind = null;
  }

  protected updateLevel(_dt: number, worldDt: number, now: number, canSpawn: boolean): void {
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      f.update(worldDt, GRAVITY);
      if (f.isGone()) {
        f.destroy();
        this.fruits.splice(i, 1);
      }
    }
    if (canSpawn) this.spawnLogic();
    if (!this.ending) this.handleSlicing(now);
  }

  protected clearLevel(): void {
    this.fruits.forEach((f) => f.destroy());
    this.fruits = [];
  }

  // ------------------------------------------------------------------ spawning

  private spawnLogic(): void {
    if (this.playMs < this.nextSpawnMs) return;
    const p = this.progress;
    const r = Math.random();
    const count = p < 0.2 ? 1 : p < 0.55 ? (r < 0.55 ? 1 : 2) : r < 0.35 ? 1 : r < 0.8 ? 2 : 3;
    for (let i = 0; i < count; i++) this.time.delayedCall(i * 260, () => this.running && this.launch(this.pickKind()));
    this.nextSpawnMs = this.playMs + Phaser.Math.Linear(1950, 1250, p) + Phaser.Math.Between(-200, 200);
  }

  private pickKind(): FruitKind {
    let k: FruitKind;
    do k = Phaser.Utils.Array.GetRandom(FRUIT_KINDS) as FruitKind;
    while (k === this.lastKind);
    this.lastKind = k;
    return k;
  }

  private launch(kind: FruitKind): void {
    const x0 = Phaser.Math.Between(300, GAME_W - 300);
    const y0 = GAME_H + 90;
    const apex = Phaser.Math.Between(150, 360);
    const vy = -Math.sqrt(2 * GRAVITY * (y0 - apex));
    const flight = (2 * -vy) / GRAVITY;
    const landX = Phaser.Math.Clamp(x0 + Phaser.Math.Between(-320, 320), 220, GAME_W - 220);
    this.fruits.push(new Fruit(this, kind, x0, y0, (landX - x0) / flight, vy));
  }

  // ------------------------------------------------------------------ slicing

  private handleSlicing(now: number): void {
    this.hub.hands.forEach((hand, hi) => {
      if (!hand.visible) {
        hand.sliceX = NaN;
        return;
      }
      if (Number.isNaN(hand.sliceX)) {
        hand.sliceX = hand.x;
        hand.sliceY = hand.y;
        return;
      }
      const ax = hand.sliceX;
      const ay = hand.sliceY;
      hand.sliceX = hand.x;
      hand.sliceY = hand.y;
      if (hand.speed >= this.sliceSpeed) {
        const angle = Math.atan2(hand.y - ay, hand.x - ax);
        for (const f of this.fruits) {
          if (!f.sliced && segmentHitsCircle(ax, ay, hand.x, hand.y, f.x, f.y, f.radius)) this.slice(f, angle, hi, now);
        }
      }
      // close a swipe chain after a short gap → award Calligraphy Flow combos
      const sw = this.swipes[hi];
      if (sw.count > 0 && now - sw.lastHit > COMBO_GAP_MS) {
        if (sw.count >= COMBO_MIN) this.awardCombo(sw.count, hand, now);
        sw.count = 0;
      }
    });
    this.fruits = this.fruits.filter((f) => !f.sliced);
  }

  private slice(f: Fruit, angle: number, hi: number, now: number): void {
    f.sliced = true;
    const sw = this.swipes[hi];
    sw.count++;
    sw.lastHit = now;
    audio.slice(sw.count - 1, f.type);
    sliceFruitFx(this, f, angle, this.drifters, this.services.tapestry, this.reducedMotion);
    this.success(f.x, f.y, POINTS_FRUIT);
    f.destroy();
  }

  private awardCombo(count: number, hand: Hand, now: number): void {
    audio.combo(count);
    this.trails.ribbon(hand, now, RAINBOW);
    this.bonus(hand.x, hand.y - 30, count * 10, `Flow ×${count}  +${count * 10}`);
    this.garden.spawnButterfly(hand.x, hand.y);
    this.noteCombo(count);
    this.say('Wonderful sweeping!', 'cheer', true);
  }
}

export function segmentHitsCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((cx - ax) * dx + (cy - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = ax + dx * t - cx;
  const py = ay + dy * t - cy;
  return px * px + py * py <= r * r;
}
