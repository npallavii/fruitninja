import Phaser from 'phaser';
import { audio } from '../../audio/audio';
import type { Speaker } from '../../audio/voice';
import type { Hand, InputHub } from '../../input/inputHub';
import { settings, sliceSpeedFor } from '../../state/settings';
import type { LevelId, RoundResult } from '../../state/types';
import { Drifters } from '../effects/Drifters';
import { floatScore, petalShower } from '../effects/sliceFx';
import { Trails } from '../effects/Trails';
import { Fruit } from '../entities/Fruit';
import { registerTextures } from '../registerTextures';
import type { GameServices } from '../services';
import { FrostMoment } from '../systems/FrostMoment';
import { LivingGarden } from '../systems/LivingGarden';

const POINTS_FROST = 30;
const CRYSTAL_GRAVITY = 430;

export interface LevelConfig {
  key: LevelId;
  /** who talks during this level */
  companion: Speaker;
  intro: { camera: string; mouse: string };
  cheers: string[];
  /** a flower wakes up after this many successes */
  successesPerBloom: number;
  gardenPlaces?: { x: number; y: number; scale?: number }[];
  /** which body points get brush trails and cursors */
  trailSource?: (hub: InputHub) => Hand[];
}

/**
 * Everything the three worlds share: the round timer, scoring, the living garden,
 * the Morning Frost crystal, companion lines, tracking checks and the ending.
 * Each world only adds its own way of playing.
 */
export abstract class LevelScene extends Phaser.Scene {
  protected drifters!: Drifters;
  protected trails!: Trails;
  protected garden!: LivingGarden;
  protected frost!: FrostMoment;

  protected playMs = 0;
  protected roundMs = 60000;
  protected running = false;
  protected ending = false;

  protected score = 0;
  protected successes = 0;
  protected combos = 0;
  protected bestCombo = 0;
  private activeSeconds = 0;
  private frostCleared = 0;

  private crystal: Fruit | null = null;
  private crystalTimes: number[] = [];
  private lastHud = 0;
  private lastLine = 0;
  private lostSince = 0;
  private trackingVisible = true;
  private tenSecondCue = false;

  constructor(
    protected services: GameServices,
    protected cfg: LevelConfig,
  ) {
    super({ key: cfg.key });
  }

  // ---------------------------------------------------------------- hooks for each world

  /** Create the world's own objects. */
  protected abstract setupLevel(): void;
  /**
   * Per-frame world logic. `worldDt` is slowed down during the frost moment;
   * `canSpawn` is false while paused for tracking, frost, or the ending.
   */
  protected abstract updateLevel(dt: number, worldDt: number, now: number, canSpawn: boolean): void;
  /** Remove remaining world objects before the final painting is captured. */
  protected abstract clearLevel(): void;

  // ---------------------------------------------------------------- shared helpers

  protected get reducedMotion(): boolean {
    return settings.get().reducedMotion;
  }

  protected get sliceSpeed(): number {
    return sliceSpeedFor(settings.get().sensitivity);
  }

  protected get hub(): InputHub {
    return this.services.hub;
  }

  /** Progress through the round, 0 → 1. */
  protected get progress(): number {
    return Math.min(1, this.playMs / this.roundMs);
  }

  /** A child succeeded at something: points, a gentle "+N", and the garden grows. */
  protected success(x: number, y: number, points: number, label?: string): void {
    this.score += points;
    this.successes++;
    floatScore(this, x, y, label ?? `+${points}`);
    this.garden.wiggleNear(x);
    if (this.successes % this.cfg.successesPerBloom === 0) {
      if (this.garden.bloomNext()) {
        audio.bloom();
        if (this.garden.bloomedCount % 2 === 1) this.say(Phaser.Utils.Array.GetRandom(this.cfg.cheers) as string, 'happy');
      } else {
        this.garden.spawnButterfly();
      }
    }
  }

  /** Bonus points without counting as a success (combos, bridges, stars…). */
  protected bonus(x: number, y: number, points: number, label: string): void {
    this.score += points;
    floatScore(this, x, y, label);
  }

  protected noteCombo(count: number): void {
    this.combos++;
    this.bestCombo = Math.max(this.bestCombo, count);
    this.services.bus.emit('combo', { count });
  }

  /** The companion says something (speech bubble + voice). */
  protected say(text: string, mood: 'happy' | 'cheer' | 'calm' = 'happy', force = false): void {
    const now = performance.now();
    if (!force && now - this.lastLine < 4500) return;
    this.lastLine = now;
    this.services.bus.emit('pip', { text, mood });
  }

  // ---------------------------------------------------------------- lifecycle

  create(): void {
    registerTextures(this);
    const { hub, bus, mode } = this.services;
    this.resetShared();

    this.drifters = new Drifters(this);
    this.garden = new LivingGarden(this, this.drifters, this.reducedMotion, this.cfg.gardenPlaces);
    this.trails = new Trails(this, hub, () => this.sliceSpeed, this.cfg.trailSource);
    this.frost = new FrostMoment(this, bus, (cleared) => this.onFrostDone(cleared));

    if (mode === 'mouse') {
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => hub.setPointer(p.x, p.y, performance.now()));
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => hub.setPointer(p.x, p.y, performance.now()));
    }

    this.events.on(Phaser.Scenes.Events.PAUSE, () => audio.stopMusic());
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      audio.startMusic();
      [...hub.hands, ...hub.feet].forEach((h) => (h.sliceX = NaN));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.stopMusic();
      this.frost.cancel();
    });

    this.setupLevel();
    audio.startMusic();
    this.say(mode === 'camera' ? this.cfg.intro.camera : this.cfg.intro.mouse, 'cheer', true);
    this.running = true;
    this.emitHud(true);
  }

  private resetShared(): void {
    this.playMs = 0;
    this.roundMs = settings.get().roundSeconds * 1000;
    this.crystalTimes = this.roundMs >= 45000 ? [this.roundMs * 0.42] : [];
    if (this.roundMs >= 80000) this.crystalTimes.push(this.roundMs * 0.78);
    this.crystal = null;
    this.running = false;
    this.ending = false;
    this.tenSecondCue = false;
    this.score = this.successes = this.combos = this.bestCombo = this.frostCleared = 0;
    this.activeSeconds = 0;
    this.trackingVisible = true;
    this.lostSince = 0;
    this.lastLine = 0;
  }

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
    this.updateCrystal(worldDt);

    const canSpawn = this.running && tracked && !this.frost.active;
    if (canSpawn) {
      this.playMs += deltaMs;
      if (hub.anyHandMoving() || hub.stillness > 80 || hub.feet.some((f) => f.visible && f.speed > 140)) this.activeSeconds += dt;
      if (this.crystalTimes.length && this.playMs >= this.crystalTimes[0] && !this.crystal) {
        this.crystalTimes.shift();
        this.launchCrystal();
      }
      if (!this.tenSecondCue && this.roundMs - this.playMs < 10000) {
        this.tenSecondCue = true;
        this.say('Ten more seconds. You can do it!', 'cheer', true);
      }
      if (this.playMs >= this.roundMs) this.endRound();
    }

    this.updateLevel(dt, worldDt, now, canSpawn && !this.ending);
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

  // ---------------------------------------------------------------- Morning Frost crystal

  private launchCrystal(): void {
    const x0 = Phaser.Math.Between(400, 1200);
    const y0 = 990;
    const apex = Phaser.Math.Between(260, 340);
    const vy = -Math.sqrt(2 * CRYSTAL_GRAVITY * (y0 - apex));
    const flight = (2 * -vy) / CRYSTAL_GRAVITY;
    const landX = Phaser.Math.Clamp(x0 + Phaser.Math.Between(-260, 260), 260, 1340);
    this.crystal = new Fruit(this, 'crystal', x0, y0, (landX - x0) / flight, vy);
  }

  private updateCrystal(worldDt: number): void {
    const c = this.crystal;
    if (!c) return;
    c.update(worldDt, CRYSTAL_GRAVITY);
    if (c.isGone()) {
      c.destroy();
      this.crystal = null;
      return;
    }
    if (this.ending || this.frost.active) return;
    // touched by any hand (or the mouse) — no fast swipe needed
    const touched = this.services.hub.hands.some((h) => h.visible && Phaser.Math.Distance.Between(h.x, h.y, c.x, c.y) < c.radius + 10);
    if (touched) {
      c.destroy();
      this.crystal = null;
      this.frost.start();
    }
  }

  private onFrostDone(cleared: boolean): void {
    if (cleared) {
      this.frostCleared++;
      this.score += POINTS_FROST;
      if (!this.reducedMotion) petalShower(this, this.drifters, 26);
      this.garden.spawnButterfly();
    }
  }

  // ---------------------------------------------------------------- round end

  protected endRound(): void {
    if (this.ending) return;
    this.running = false;
    this.ending = true;
    this.frost.cancel();
    this.say('Look at the beautiful world you made!', 'cheer', true);
    audio.stopMusic();
    audio.celebrate();
    if (!this.reducedMotion) petalShower(this, this.drifters, 34);
    this.time.delayedCall(2600, () => {
      this.clearLevel();
      this.crystal?.destroy();
      this.crystal = null;
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
      level: this.cfg.key,
      score: this.score,
      fruits: this.successes,
      bestCombo: this.bestCombo,
      combos: this.combos,
      flowers: this.garden.bloomedCount,
      activeSeconds: Math.round(this.activeSeconds),
      frostCleared: this.frostCleared,
      painting,
    };
    this.services.bus.emit('roundEnd', result);
  }

  private emitHud(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastHud < 200) return;
    this.lastHud = now;
    this.services.bus.emit('hud', {
      score: this.score,
      secondsLeft: Math.max(0, Math.ceil((this.roundMs - this.playMs) / 1000)),
      fruits: this.successes,
      flowers: this.garden?.bloomedCount ?? 0,
    });
  }
}
