import Phaser from 'phaser';
import { FRUIT_KINDS, type FruitKind } from '../../art/fruits';
import { RAINBOW } from '../../art/palette';
import { audio } from '../../audio/audio';
import { GAME_H, GAME_W, type Hand } from '../../input/inputHub';
import { settings, sliceSpeedFor } from '../../state/settings';
import type { RoundResult } from '../../state/types';
import { Drifters } from '../effects/Drifters';
import { floatScore, petalShower, sliceFruitFx } from '../effects/sliceFx';
import { Trails } from '../effects/Trails';
import { Fruit } from '../entities/Fruit';
import { registerTextures } from '../registerTextures';
import type { GameServices } from '../services';
import { FrostMoment } from '../systems/FrostMoment';
import { LivingGarden } from '../systems/LivingGarden';

const GRAVITY = 430; // floaty — gives children time to anticipate
const POINTS_FRUIT = 10;
const POINTS_FROST = 30;
const COMBO_MIN = 3;
const COMBO_GAP_MS = 450;
const FRUITS_PER_BLOOM = 3;

const CHEERS = ['You helped a flower bloom!', 'Your garden is growing!', 'Lovely movement!', 'Look, a sleepy flower woke up!'];

interface Swipe {
  count: number;
  lastHit: number;
}

export class GiggleGardenScene extends Phaser.Scene {
  private fruits: Fruit[] = [];
  private drifters!: Drifters;
  private trails!: Trails;
  private garden!: LivingGarden;
  private frost!: FrostMoment;
  private swipes: Swipe[] = [];

  private playMs = 0;
  private roundMs = 60000;
  private nextSpawnMs = 1800;
  private crystalTimes: number[] = [];
  private running = false;
  private ending = false;
  private lastKind: FruitKind | null = null;
  private lastHud = 0;
  private lastPip = 0;
  private lostSince = 0;
  private trackingVisible = true;
  private tenSecondCue = false;

  private score = 0;
  private fruitsSliced = 0;
  private combos = 0;
  private bestCombo = 0;
  private activeSeconds = 0;
  private frostCleared = 0;

  constructor(private services: GameServices) {
    super({ key: 'giggle' });
  }

  private get reducedMotion(): boolean {
    return settings.get().reducedMotion;
  }

  private get sliceSpeed(): number {
    return sliceSpeedFor(settings.get().sensitivity);
  }

  create(): void {
    registerTextures(this);
    const { hub, bus, mode } = this.services;
    this.resetState();

    this.drifters = new Drifters(this);
    this.garden = new LivingGarden(this, this.drifters, this.reducedMotion);
    this.trails = new Trails(this, hub, () => this.sliceSpeed);
    this.frost = new FrostMoment(this, bus, (cleared) => this.onFrostDone(cleared));

    if (mode === 'mouse') {
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => hub.setPointer(p.x, p.y, performance.now()));
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => hub.setPointer(p.x, p.y, performance.now()));
    }

    this.events.on(Phaser.Scenes.Events.PAUSE, () => audio.stopMusic());
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      audio.startMusic();
      hub.hands.forEach((h) => (h.sliceX = NaN));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.stopMusic();
      this.frost.cancel();
    });

    audio.startMusic();
    this.say(mode === 'camera' ? 'Swish your arms through the fruit!' : 'Swish across the fruit to slice it!', 'cheer', true);
    this.running = true;
    this.emitHud(true);
  }

  private resetState(): void {
    this.fruits = [];
    this.swipes = [
      { count: 0, lastHit: 0 },
      { count: 0, lastHit: 0 },
    ];
    this.playMs = 0;
    this.roundMs = settings.get().roundSeconds * 1000;
    this.nextSpawnMs = 1000;
    this.crystalTimes = this.roundMs >= 45000 ? [this.roundMs * 0.42] : [];
    if (this.roundMs >= 80000) this.crystalTimes.push(this.roundMs * 0.78);
    this.running = false;
    this.ending = false;
    this.lastKind = null;
    this.tenSecondCue = false;
    this.score = this.fruitsSliced = this.combos = this.bestCombo = this.frostCleared = 0;
    this.activeSeconds = 0;
    this.trackingVisible = true;
    this.lostSince = 0;
  }

  // ------------------------------------------------------------------ loop

  update(time: number, deltaMs: number): void {
    const { hub } = this.services;
    const now = performance.now();
    const dt = Math.min(deltaMs, 50) / 1000;
    hub.tick(now);

    this.drifters.update(dt);
    this.garden.update(dt, time / 1000, hub);
    this.trails.update(now);

    const tracked = this.checkTracking(now);
    const still = hub.mode === 'pose' ? hub.stillness < 95 : hub.stillness < 45;
    this.frost.update(dt, still);
    const worldDt = dt * this.frost.timeScale;

    // fruits
    for (let i = this.fruits.length - 1; i >= 0; i--) {
      const f = this.fruits[i];
      f.update(worldDt, GRAVITY);
      if (f.isGone()) {
        f.destroy();
        this.fruits.splice(i, 1);
      }
    }

    if (this.running && tracked && !this.frost.active) {
      this.playMs += deltaMs;
      if (hub.anyHandMoving()) this.activeSeconds += dt;
      this.spawnLogic();
      if (!this.tenSecondCue && this.roundMs - this.playMs < 10000) {
        this.tenSecondCue = true;
        this.say('Ten more seconds — keep swishing!', 'cheer', true);
      }
      if (this.playMs >= this.roundMs) this.endRound();
    }

    if (!this.ending) this.handleSlicing(now);
    this.emitHud();
  }

  private checkTracking(now: number): boolean {
    const { hub, bus } = this.services;
    if (hub.mode !== 'pose') return true;
    const visible = hub.bodyVisible;
    if (!visible) {
      if (!this.lostSince) this.lostSince = now;
    } else this.lostSince = 0;
    const ok = visible || now - this.lostSince < 1200;
    if (ok !== this.trackingVisible) {
      this.trackingVisible = ok;
      bus.emit('tracking', { visible: ok });
    }
    return ok;
  }

  // ------------------------------------------------------------------ spawning

  private spawnLogic(): void {
    if (this.crystalTimes.length && this.playMs >= this.crystalTimes[0]) {
      this.crystalTimes.shift();
      this.launch('crystal');
      this.nextSpawnMs = this.playMs + 2600;
      return;
    }
    if (this.playMs < this.nextSpawnMs) return;
    const p = this.playMs / this.roundMs;
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

  private launch(type: FruitKind | 'crystal'): void {
    const x0 = Phaser.Math.Between(300, GAME_W - 300);
    const y0 = GAME_H + 90;
    const apex = type === 'crystal' ? Phaser.Math.Between(260, 330) : Phaser.Math.Between(150, 360);
    const vy = -Math.sqrt(2 * GRAVITY * (y0 - apex));
    const flight = (2 * -vy) / GRAVITY;
    const landX = Phaser.Math.Clamp(x0 + Phaser.Math.Between(-320, 320), 220, GAME_W - 220);
    this.fruits.push(new Fruit(this, type, x0, y0, (landX - x0) / flight, vy));
  }

  // ------------------------------------------------------------------ slicing

  private handleSlicing(now: number): void {
    const { hub } = this.services;
    hub.hands.forEach((hand, hi) => {
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
    if (f.type === 'crystal') {
      f.destroy();
      this.frost.start();
      return;
    }
    const sw = this.swipes[hi];
    sw.count++;
    sw.lastHit = now;
    this.fruitsSliced++;
    this.score += POINTS_FRUIT;
    audio.slice(sw.count - 1, f.type);
    sliceFruitFx(this, f, angle, this.drifters, this.services.tapestry, this.reducedMotion);
    floatScore(this, f.x, f.y, `+${POINTS_FRUIT}`);
    this.garden.wiggleNear(f.x);
    f.destroy();

    if (this.fruitsSliced % FRUITS_PER_BLOOM === 0) {
      if (this.garden.bloomNext()) {
        audio.bloom();
        if (this.garden.bloomedCount % 2 === 1) this.say(Phaser.Utils.Array.GetRandom(CHEERS) as string, 'happy');
      } else {
        this.garden.spawnButterfly();
      }
    }
  }

  private awardCombo(count: number, hand: Hand, now: number): void {
    this.combos++;
    this.bestCombo = Math.max(this.bestCombo, count);
    const bonus = count * 10;
    this.score += bonus;
    audio.combo(count);
    this.trails.ribbon(hand, now, RAINBOW);
    floatScore(this, hand.x, hand.y - 30, `Flow ×${count}  +${bonus}`);
    this.garden.spawnButterfly(hand.x, hand.y);
    this.services.bus.emit('combo', { count });
    this.say('Wonderful sweeping!', 'cheer', true);
  }

  private onFrostDone(cleared: boolean): void {
    if (cleared) {
      this.frostCleared++;
      this.score += POINTS_FROST;
      if (!this.reducedMotion) petalShower(this, this.drifters, 26);
      this.garden.spawnButterfly();
    }
    this.nextSpawnMs = this.playMs + 900;
  }

  // ------------------------------------------------------------------ round end

  private endRound(): void {
    if (this.ending) return;
    this.running = false;
    this.ending = true;
    this.frost.cancel();
    this.say('Look at your beautiful garden!', 'cheer', true);
    audio.stopMusic();
    audio.celebrate();
    if (!this.reducedMotion) petalShower(this, this.drifters, 34);
    this.time.delayedCall(2600, () => {
      this.fruits.forEach((f) => f.destroy());
      this.fruits = [];
      this.trails.hide();
      this.drifters.clear();
      // snapshot the blooming flowers + butterflies, layered over the painted paper
      this.game.renderer.snapshot((img) => {
        const painting = this.services.tapestry.compose(img instanceof HTMLImageElement ? img : null);
        this.finish(painting);
      });
    });
  }

  private finish(painting: string | null): void {
    const result: RoundResult = {
      level: 'giggle',
      score: this.score,
      fruits: this.fruitsSliced,
      bestCombo: this.bestCombo,
      combos: this.combos,
      flowers: this.garden.bloomedCount,
      activeSeconds: Math.round(this.activeSeconds),
      frostCleared: this.frostCleared,
      painting,
    };
    this.services.bus.emit('roundEnd', result);
  }

  // ------------------------------------------------------------------ helpers

  private say(text: string, mood: 'happy' | 'cheer' | 'calm' = 'happy', force = false): void {
    const now = performance.now();
    if (!force && now - this.lastPip < 3500) return;
    this.lastPip = now;
    this.services.bus.emit('pip', { text, mood });
  }

  private emitHud(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastHud < 200) return;
    this.lastHud = now;
    this.services.bus.emit('hud', {
      score: this.score,
      secondsLeft: Math.max(0, Math.ceil((this.roundMs - this.playMs) / 1000)),
      fruits: this.fruitsSliced,
      flowers: this.garden?.bloomedCount ?? 0,
    });
  }
}

function segmentHitsCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((cx - ax) * dx + (cy - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = ax + dx * t - cx;
  const py = ay + dy * t - cy;
  return px * px + py * py <= r * r;
}
