import Phaser from 'phaser';
import { FRUIT_KINDS, FRUIT_SPECS, type FruitKind } from '../../art/fruits';
import { splashIndexFor } from '../../art/textures';
import { audio } from '../../audio/audio';
import { GAME_W } from '../../input/inputHub';
import { rippleAt, splashFx } from '../effects/waterFx';
import type { GameServices } from '../services';
import { LevelScene } from './LevelScene';

const POINTS_CATCH = 10;
const POINTS_LOTUS = 25;
const HORIZON_Y = 585; // where the river meets the far bank
const BOAT_Y = 805; // where the boat sails, near the viewer
const CATCH_HALF_WIDTH = 120;
/** Small side-steps move the boat across the whole river. */
const STEER_GAIN = 1.9;

interface Floater {
  img: Phaser.GameObjects.Image;
  kind: FruitKind | 'lotus';
  startX: number;
  endX: number;
  t: number;
  duration: number;
  baseScale: number;
  caught: boolean;
}

/** Flowers grow among the reeds on both riverbanks. */
const REED_FLOWERS = [
  { x: 80, y: 905 },
  { x: 165, y: 860 },
  { x: 245, y: 910 },
  { x: 115, y: 760, scale: 0.8 },
  { x: 205, y: 720, scale: 0.7 },
  { x: 1355, y: 905 },
  { x: 1435, y: 860 },
  { x: 1515, y: 910 },
  { x: 1480, y: 760, scale: 0.8 },
];

/**
 * Level 2 — The Wiggly Waterway: sway and side-step to steer Bloop's basket boat
 * and catch the fruit floating down the river. Uses the shoulders/hips, which the
 * camera sees reliably, so no foot tracking is needed.
 */
export class WaterwayScene extends LevelScene {
  private boat!: Phaser.GameObjects.Container;
  private boatX = GAME_W / 2;
  private floaters: Floater[] = [];
  private nextSpawnMs = 900;
  private nextLotusMs = 11000;
  private lastLaneX = 0;

  constructor(services: GameServices) {
    super(services, {
      key: 'waterway',
      companion: 'bloop',
      intro: {
        camera: 'Hi, I’m Bloop! Sway left and right to steer my basket boat, and catch the fruit!',
        mouse: 'Hi, I’m Bloop! Move the mouse to steer my basket boat, and catch the fruit!',
      },
      cheers: ['Splish splash, what a catch!', 'Lovely swaying!', 'A flower opened by the river!', 'Ribbit! Great steering!'],
      successesPerBloom: 3,
      gardenPlaces: REED_FLOWERS,
      trailSource: () => [], // steering uses the whole body, so no hand cursors here
    });
  }

  protected setupLevel(): void {
    this.floaters = [];
    this.nextSpawnMs = 900;
    this.nextLotusMs = 11000;
    this.boatX = GAME_W / 2;
    const pad = this.add.image(0, 16, 'lilypad').setScale(1.15, 0.9);
    const basket = this.add.image(0, -14, 'basket').setScale(0.85);
    this.boat = this.add.container(this.boatX, BOAT_Y, [pad, basket]).setDepth(9);
    // a gentle bob on the water
    this.tweens.add({ targets: this.boat, angle: { from: -2.5, to: 2.5 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Where the child wants the boat: their body centre (camera) or the mouse. */
  private steerTarget(): number | null {
    const hub = this.hub;
    if (hub.mode === 'mouse') return hub.hands[0].visible ? hub.hands[0].x : null;
    if (hub.shouldersVisible) return 800 + (hub.bodyX - 800) * STEER_GAIN;
    if (hub.hipsVisible) return 800 + (hub.hipX - 800) * STEER_GAIN;
    return null;
  }

  protected updateLevel(dt: number, worldDt: number, _now: number, canSpawn: boolean): void {
    const target = this.steerTarget();
    if (target !== null && !this.ending) {
      const clamped = Phaser.Math.Clamp(target, 150, GAME_W - 150);
      this.boatX += (clamped - this.boatX) * Math.min(1, dt * 7);
      this.boat.x = this.boatX;
    }

    // iterate over a copy: catching or drifting away removes items from the list
    [...this.floaters].forEach((f, i) => {
      f.t += worldDt / f.duration;
      const t = f.t;
      // perspective: far & small at the horizon, near & big at the boat
      f.img.y = HORIZON_Y + (BOAT_Y - 40 - HORIZON_Y) * t + Math.sin(t * 9 + i) * 4;
      f.img.x = f.startX + (f.endX - f.startX) * t;
      f.img.setScale(f.baseScale * (0.32 + 0.68 * Math.min(1, t)));
      f.img.rotation = Math.sin(t * 6 + i) * 0.12;
      if (t >= 0.9 && t <= 1.08 && !this.ending && Math.abs(f.img.x - this.boatX) < CATCH_HALF_WIDTH) this.catch(f);
      else if (t > 1.25) {
        // floated past — it simply drifts away, no penalty
        this.floaters = this.floaters.filter((x) => x !== f);
        this.tweens.add({ targets: f.img, alpha: 0, y: f.img.y + 30, duration: 500, onComplete: () => f.img.destroy() });
      }
    });

    if (canSpawn && this.playMs >= this.nextSpawnMs) this.spawnFruit();
    if (canSpawn && this.playMs >= this.nextLotusMs) this.spawnLotus();
  }

  protected clearLevel(): void {
    this.floaters.forEach((f) => f.img.destroy());
    this.floaters = [];
  }

  // ------------------------------------------------------------------ the river

  private launch(kind: FruitKind | 'lotus', duration: number): void {
    // pick a lane away from the last one so the child has to steer
    let startX: number;
    do startX = Phaser.Math.Between(560, 1040);
    while (Math.abs(startX - this.lastLaneX) < 120);
    this.lastLaneX = startX;
    const endX = Phaser.Math.Clamp(800 + (startX - 800) * 2.6, 170, GAME_W - 170);
    const baseScale = kind === 'lotus' ? 1.5 : 0.82 * FRUIT_SPECS[kind].scale;
    const img = this.add
      .image(startX, HORIZON_Y, kind === 'lotus' ? 'lotus' : `fruit-${kind}`)
      .setScale(baseScale * 0.32)
      .setDepth(8)
      .setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 500 });
    rippleAt(this, startX, HORIZON_Y + 10, this.reducedMotion, 1);
    this.floaters.push({ img, kind, startX, endX, t: 0, duration, baseScale, caught: false });
  }

  private spawnFruit(): void {
    const p = this.progress;
    const duration = Phaser.Math.Linear(5.2, 3.8, p);
    this.launch(Phaser.Utils.Array.GetRandom(FRUIT_KINDS) as FruitKind, duration);
    this.nextSpawnMs = this.playMs + Phaser.Math.Linear(2300, 1450, p) + Phaser.Math.Between(-200, 200);
  }

  private spawnLotus(): void {
    this.launch('lotus', 5);
    this.say('A golden lotus is floating by. Catch it!', 'cheer', true);
    this.nextLotusMs = this.playMs + Phaser.Math.Between(12000, 15000);
  }

  private catch(f: Floater): void {
    f.caught = true;
    this.floaters = this.floaters.filter((x) => x !== f);
    const x = f.img.x;
    const y = f.img.y;
    audio.water();
    audio.tap();
    if (f.kind === 'lotus') {
      audio.chimes(5, 86);
      this.success(x, y - 60, POINTS_LOTUS, `Golden lotus! +${POINTS_LOTUS}`);
      this.garden.spawnButterfly(x, y - 80);
      this.say('You caught the golden lotus! Ribbit!', 'cheer', true);
      rippleAt(this, x, BOAT_Y + 10, this.reducedMotion, 3);
    } else {
      splashFx(this, x, BOAT_Y - 10, splashIndexFor(FRUIT_SPECS[f.kind].juice), this.drifters, this.services.tapestry, this.reducedMotion);
      this.success(x, y - 50, POINTS_CATCH);
    }
    // hop into the basket
    this.tweens.add({
      targets: f.img,
      x: this.boatX,
      y: BOAT_Y - 30,
      scale: f.img.scale * 0.5,
      alpha: 0,
      duration: 320,
      ease: 'Back.easeIn',
      onComplete: () => f.img.destroy(),
    });
    this.tweens.add({ targets: this.boat, scaleX: 1.08, scaleY: 0.92, duration: 120, yoyo: true, ease: 'Sine.easeOut' });
  }
}
