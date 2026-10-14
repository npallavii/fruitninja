import Phaser from 'phaser';
import { FRUIT_SPECS, type FruitKind } from '../../art/fruits';
import { PALETTE, hexToNumber } from '../../art/palette';
import { splashIndexFor } from '../../art/textures';
import { audio } from '../../audio/audio';
import { GAME_W, type Hand } from '../../input/inputHub';
import { rippleAt, splashFx } from '../effects/waterFx';
import type { GameServices } from '../services';
import { LevelScene } from './LevelScene';

const ROLL_KINDS: FruitKind[] = ['watermelon', 'orange', 'peach', 'watermelon'];
const POINTS_SPLASH = 10;
const POINTS_PAD = 20;
const PAD_HOLD = 1.2; // seconds standing on the lily pad
const PAD_TIMEOUT = 9;
const PAD_SPOTS = [330, 800, 1270];

interface Roller {
  img: Phaser.GameObjects.Image;
  kind: FruitKind;
  vx: number;
  r: number;
  phase: number;
  hit: boolean;
}

interface Pad {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Graphics;
  x: number;
  hold: number;
  age: number;
  done: boolean;
}

/** Flowers grow among the reeds on both riverbanks. */
const REED_FLOWERS = [
  { x: 90, y: 905 },
  { x: 175, y: 865 },
  { x: 255, y: 910 },
  { x: 125, y: 770, scale: 0.8 },
  { x: 215, y: 735, scale: 0.7 },
  { x: 1345, y: 905 },
  { x: 1425, y: 865 },
  { x: 1505, y: 910 },
  { x: 1470, y: 770, scale: 0.8 },
];

/** Level 2 — The Wiggly Waterway: step and stomp beside the river; stand on lily pads. */
export class WaterwayScene extends LevelScene {
  private rollers: Roller[] = [];
  private pad: Pad | null = null;
  private laneY = 790;
  private nextSpawnMs = 1200;
  private nextPadMs = 9000;
  private lastPadX = 0;
  private fromLeft = true;
  private feetMissingSince = 0;
  private handsHintGiven = false;

  constructor(services: GameServices) {
    super(services, {
      key: 'waterway',
      companion: 'bloop',
      intro: {
        camera: 'Hi, I’m Bloop! Step and stomp to splash the rolling melons!',
        mouse: 'Hi, I’m Bloop! Tap the rolling melons to make a splash!',
      },
      cheers: ['Splish splash!', 'What happy feet!', 'A flower opened by the river!', 'Ribbit! Lovely stepping!'],
      successesPerBloom: 3,
      gardenPlaces: REED_FLOWERS,
      trailSource: (hub) => (hub.mode === 'pose' ? hub.feet : hub.hands),
    });
  }

  protected setupLevel(): void {
    this.rollers = [];
    this.pad = null;
    this.laneY = 790;
    this.nextSpawnMs = 1200;
    this.nextPadMs = 9000;
    this.feetMissingSince = 0;
    this.handsHintGiven = false;
    if (this.services.mode === 'mouse') {
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.stompAt(p.x, p.y));
    }
  }

  /** The body points that can splash: feet when we can see them, otherwise hands. */
  private splashers(now: number): Hand[] {
    const hub = this.hub;
    if (hub.mode === 'mouse') return hub.hands.slice(0, 1).filter((h) => h.visible);
    const feet = hub.feet.filter((f) => f.visible);
    if (feet.length) {
      this.feetMissingSince = 0;
      return feet;
    }
    if (!this.feetMissingSince) this.feetMissingSince = now;
    if (now - this.feetMissingSince > 2500) {
      if (!this.handsHintGiven) {
        this.handsHintGiven = true;
        this.say('I can’t see your feet. You can splash with your hands too!', 'calm', true);
      }
      return hub.hands.filter((h) => h.visible);
    }
    return [];
  }

  protected updateLevel(dt: number, worldDt: number, now: number, canSpawn: boolean): void {
    // the riverbank lane follows where the child's feet are
    const feet = this.hub.feet.filter((f) => f.visible);
    if (this.hub.mode === 'pose' && feet.length) {
      const avg = feet.reduce((s, f) => s + f.y, 0) / feet.length;
      this.laneY += (Phaser.Math.Clamp(avg - 10, 600, 830) - this.laneY) * Math.min(1, dt * 2);
    }

    for (let i = this.rollers.length - 1; i >= 0; i--) {
      const r = this.rollers[i];
      if (r.hit) continue;
      r.img.x += r.vx * worldDt;
      r.img.rotation += (r.vx / r.r) * worldDt;
      r.phase += worldDt * 5;
      r.img.y = this.laneY - Math.abs(Math.sin(r.phase)) * 10; // playful little bounce
      if ((r.vx > 0 && r.img.x > GAME_W + 140) || (r.vx < 0 && r.img.x < -140)) {
        r.img.destroy();
        this.rollers.splice(i, 1);
      }
    }

    if (canSpawn && this.playMs >= this.nextSpawnMs) this.spawnRoller();
    if (canSpawn && !this.pad && this.playMs >= this.nextPadMs) this.spawnPad();
    if (this.pad) this.updatePad(dt);

    if (this.ending) return;
    const minSpeed = this.hub.mode === 'mouse' ? 180 : 90;
    for (const pt of this.splashers(now)) {
      for (const r of this.rollers) {
        if (!r.hit && pt.speed > minSpeed && Phaser.Math.Distance.Between(pt.x, pt.y, r.img.x, r.img.y) < r.r + 38) this.splash(r);
      }
    }
  }

  protected clearLevel(): void {
    this.rollers.forEach((r) => r.img.destroy());
    this.rollers = [];
    if (this.pad) this.removePad(this.pad, 0);
    this.pad = null;
  }

  // ------------------------------------------------------------------ rolling fruit

  private spawnRoller(): void {
    const p = this.progress;
    const launch = (fromLeft: boolean) => {
      const kind = Phaser.Utils.Array.GetRandom(ROLL_KINDS) as FruitKind;
      const scale = 0.78 * FRUIT_SPECS[kind].scale;
      const x = fromLeft ? -110 : GAME_W + 110;
      const speed = Phaser.Math.Between(110, 165) * (1 + p * 0.25);
      const img = this.add.image(x, this.laneY, `fruit-${kind}`).setScale(scale).setDepth(10);
      this.rollers.push({ img, kind, vx: fromLeft ? speed : -speed, r: 78 * scale, phase: Math.random() * 3, hit: false });
    };
    launch(this.fromLeft);
    if (p > 0.5 && Math.random() < 0.3) this.time.delayedCall(700, () => this.running && launch(!this.fromLeft));
    this.fromLeft = !this.fromLeft;
    this.nextSpawnMs = this.playMs + Phaser.Math.Linear(2400, 1500, p) + Phaser.Math.Between(-200, 200);
  }

  private stompAt(x: number, y: number): void {
    if (this.ending) return;
    for (const r of this.rollers) {
      if (!r.hit && Phaser.Math.Distance.Between(x, y, r.img.x, r.img.y) < r.r + 40) this.splash(r);
    }
  }

  private splash(r: Roller): void {
    r.hit = true;
    audio.water();
    audio.tap();
    splashFx(this, r.img.x, r.img.y, splashIndexFor(FRUIT_SPECS[r.kind].juice), this.drifters, this.services.tapestry, this.reducedMotion);
    this.success(r.img.x, r.img.y - 40, POINTS_SPLASH);
    this.tweens.add({
      targets: r.img,
      scaleY: r.img.scaleY * 0.55,
      scaleX: r.img.scaleX * 1.2,
      alpha: 0,
      y: r.img.y + 12,
      duration: 380,
      ease: 'Sine.easeIn',
      onComplete: () => {
        r.img.destroy();
        this.rollers = this.rollers.filter((x) => x !== r);
      },
    });
  }

  // ------------------------------------------------------------------ lily pads (stepping + balance)

  private spawnPad(): void {
    const x = Phaser.Utils.Array.GetRandom(PAD_SPOTS.filter((s) => s !== this.lastPadX)) as number;
    this.lastPadX = x;
    const glow = this.add.image(x, this.laneY + 6, 'lilypad-glow').setDepth(6).setAlpha(0);
    const img = this.add.image(x, this.laneY + 6, 'lilypad').setDepth(7).setScale(0);
    const ring = this.add.graphics().setDepth(7).setPosition(x, this.laneY + 6).setScale(1, 0.42);
    this.tweens.add({ targets: img, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 0.9 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    rippleAt(this, x, this.laneY + 6, this.reducedMotion);
    audio.water();
    this.pad = { img, glow, ring, x, hold: 0, age: 0, done: false };
    this.say(
      this.hub.mode === 'pose' ? 'Step onto the glowing lily pad!' : 'Rest the mouse on the glowing lily pad!',
      'cheer',
      true,
    );
  }

  private updatePad(dt: number): void {
    const pad = this.pad!;
    if (pad.done) return;
    pad.age += dt;
    const y = this.laneY + 6;
    pad.img.y = pad.glow.y = pad.ring.y = y;

    let on = false;
    const hub = this.hub;
    if (hub.mode === 'pose') {
      const feet = hub.feet.filter((f) => f.visible);
      const bodyX = hub.hipsVisible ? hub.hipX : feet.length ? feet.reduce((s, f) => s + f.x, 0) / feet.length : NaN;
      on = Math.abs(bodyX - pad.x) < 150;
    } else {
      const h = hub.hands[0];
      on = h.visible && Phaser.Math.Distance.Between(h.x, h.y, pad.x, y) < 130;
    }
    if (!this.frost.active) pad.hold = Phaser.Math.Clamp(pad.hold + (on ? dt : -dt * 0.5), 0, PAD_HOLD);

    const g = pad.ring;
    g.clear();
    g.lineStyle(10, 0xffffff, 0.5);
    g.strokeCircle(0, 0, 120);
    if (pad.hold > 0) {
      g.lineStyle(10, hexToNumber(PALETTE.matcha), 0.95);
      g.beginPath();
      g.arc(0, 0, 120, -Math.PI / 2, -Math.PI / 2 + (pad.hold / PAD_HOLD) * Math.PI * 2);
      g.strokePath();
    }

    if (pad.hold >= PAD_HOLD) this.padSuccess(pad);
    else if (pad.age > PAD_TIMEOUT && !this.frost.active) {
      this.removePad(pad, 900);
      this.pad = null;
      this.nextPadMs = this.playMs + 8000;
    }
  }

  private padSuccess(pad: Pad): void {
    pad.done = true;
    pad.ring.clear();
    const lotus = this.add.image(pad.x, pad.img.y - 18, 'lotus').setDepth(8).setScale(0);
    this.tweens.add({ targets: lotus, scale: 1.3, duration: 700, ease: 'Back.easeOut' });
    rippleAt(this, pad.x, pad.img.y, this.reducedMotion, 3);
    audio.bloom();
    audio.chimes(4, 84);
    this.success(pad.x, pad.img.y - 70, POINTS_PAD, `Lily pad! +${POINTS_PAD}`);
    this.garden.spawnButterfly(pad.x, pad.img.y - 80);
    this.say('You found the lily pad! Ribbit!', 'cheer', true);
    this.time.delayedCall(1600, () => {
      this.tweens.add({ targets: lotus, alpha: 0, duration: 900, onComplete: () => lotus.destroy() });
      this.removePad(pad, 900);
      if (this.pad === pad) this.pad = null;
      this.nextPadMs = this.playMs + Phaser.Math.Between(9000, 12000);
    });
  }

  private removePad(pad: Pad, duration: number): void {
    this.tweens.killTweensOf(pad.glow);
    const parts = [pad.img, pad.glow, pad.ring];
    if (!duration) return parts.forEach((p) => p.destroy());
    this.tweens.add({ targets: parts, alpha: 0, duration, onComplete: () => parts.forEach((p) => p.destroy()) });
  }
}
