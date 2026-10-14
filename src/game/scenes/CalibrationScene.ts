import Phaser from 'phaser';
import { PALETTE, hexToNumber } from '../../art/palette';
import { blob, ctx2d, makeCanvas, mulberry32 } from '../../art/watercolor';
import { audio } from '../../audio/audio';
import { checkPlacement } from '../../vision/calibration';
import { Drifters } from '../effects/Drifters';
import { Trails } from '../effects/Trails';
import { registerTextures } from '../registerTextures';
import type { GameServices } from '../services';

const POND_X = 800;
const POND_Y = 790;
const LOTUS_COUNT = 12;
const HOLD_SECONDS = 2;

function paintPond(): HTMLCanvasElement {
  const c = makeCanvas(820, 260);
  const ctx = ctx2d(c);
  const rng = mulberry32(5);
  blob(ctx, 410, 130, 360, 95, PALETTE.water, rng, { layers: 22, alpha: 0.08, blend: 'source-over' });
  blob(ctx, 410, 135, 300, 70, PALETTE.slate, rng, { layers: 10, alpha: 0.05, blend: 'source-over' });
  for (const [x, y] of [[170, 120], [640, 150], [560, 90]] as const) {
    blob(ctx, x, y, 42, 16, PALETTE.matcha, rng, { layers: 8, alpha: 0.18, blend: 'source-over' });
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (const [x, y, l] of [[300, 110, 60], [460, 160, 80], [380, 140, 40]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + l, y);
    ctx.stroke();
  }
  return c;
}

/** "The Stepping Stone": the child steps into a soft outline beside a pond. */
export class CalibrationScene extends Phaser.Scene {
  private progress = 0;
  private done = false;
  private figure!: Phaser.GameObjects.Graphics;
  private lotuses: Phaser.GameObjects.Image[] = [];
  private trails!: Trails;
  private drifters!: Drifters;
  private lastMsg = '';
  private lastEmit = 0;
  private seen: boolean | null = null;

  constructor(private services: GameServices) {
    super({ key: 'calibration' });
  }

  create(): void {
    registerTextures(this);
    if (!this.textures.exists('pond')) this.textures.addCanvas('pond', paintPond());
    this.progress = 0;
    this.done = false;
    this.lotuses = [];

    this.add.image(POND_X, POND_Y, 'pond').setDepth(1).setAlpha(0.95);
    // outline scaled around its feet so the head sits clear of the instruction card
    const s = 0.76;
    this.figure = this.add.graphics().setDepth(2).setScale(s).setPosition(800 * (1 - s), 770 * (1 - s));
    this.drawFigure(0);

    for (let i = 0; i < LOTUS_COUNT; i++) {
      const a = (i / LOTUS_COUNT) * Math.PI * 2;
      const l = this.add
        .image(POND_X + Math.cos(a) * 380, POND_Y + Math.sin(a) * 110, 'lotus')
        .setDepth(3)
        .setScale(0)
        .setAlpha(0.95);
      this.lotuses.push(l);
    }
    this.drifters = new Drifters(this);
    this.trails = new Trails(this, this.services.hub, () => 650);
  }

  /** Soft charcoal outline of a child standing on the stepping stone. */
  private drawFigure(p: number): void {
    const g = this.figure;
    g.clear();
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(hexToNumber('#8A7A7C')),
      Phaser.Display.Color.ValueToColor(hexToNumber(PALETTE.leafDeep)),
      100,
      Math.round(p * 100),
    );
    const color = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
    const cx = 800;
    for (const [w, a] of [[16, 0.08], [7, 0.35]] as const) {
      g.lineStyle(w, color, a);
      g.strokeCircle(cx, 215, 62); // head
      g.beginPath(); // shoulders → body
      g.moveTo(cx - 120, 360);
      g.lineTo(cx - 80, 310);
      g.lineTo(cx + 80, 310);
      g.lineTo(cx + 120, 360);
      g.strokePath();
      g.beginPath(); // arms out, ready to swish
      g.moveTo(cx - 80, 315);
      g.lineTo(cx - 200, 420);
      g.moveTo(cx + 80, 315);
      g.lineTo(cx + 200, 420);
      g.strokePath();
      g.strokeRoundedRect(cx - 90, 310, 180, 270, 50); // body
      g.beginPath(); // legs
      g.moveTo(cx - 45, 575);
      g.lineTo(cx - 60, 770);
      g.moveTo(cx + 45, 575);
      g.lineTo(cx + 60, 770);
      g.strokePath();
    }
  }

  update(time: number, deltaMs: number): void {
    const { hub, bus } = this.services;
    const now = performance.now();
    const dt = Math.min(deltaMs, 50) / 1000;
    hub.tick(now);
    this.trails.update(now);
    this.drifters.update(dt);
    if (this.done) return;

    if (hub.bodyVisible !== this.seen) {
      this.seen = hub.bodyVisible;
      bus.emit('tracking', { visible: hub.bodyVisible });
    }
    const check = checkPlacement(hub.landmarks, this.services.level);
    const before = this.progress;
    this.progress = Phaser.Math.Clamp(this.progress + (check.ok ? dt / HOLD_SECONDS : -dt * 0.6), 0, 1);
    this.drawFigure(this.progress);

    const shown = Math.floor(this.progress * LOTUS_COUNT);
    this.lotuses.forEach((l, i) => {
      const target = i < shown ? 0.85 + Math.sin(time / 400 + i) * 0.05 : 0;
      l.setScale(l.scale + (target - l.scale) * 0.2);
    });
    if (Math.floor(before * LOTUS_COUNT) < shown) audio.tap();

    if (check.message !== this.lastMsg || now - this.lastEmit > 150) {
      this.lastMsg = check.message;
      this.lastEmit = now;
      bus.emit('calibration', { message: check.message, progress: this.progress, ok: check.ok });
    }

    if (this.progress >= 1) this.succeed();
  }

  private succeed(): void {
    this.done = true;
    audio.chimes(6, 84);
    this.services.bus.emit('calibration', { message: 'Hooray! The garden is waking up…', progress: 1, ok: true });
    // the outline dissolves into koi and lotus petals
    this.tweens.add({ targets: this.figure, alpha: 0, duration: 900, ease: 'Sine.easeIn' });
    for (let i = 0; i < 6; i++) {
      const koi = this.add.image(POND_X, POND_Y, 'koi').setDepth(4).setScale(0.8).setAlpha(0);
      const r = 120 + i * 30;
      const start = (i / 6) * Math.PI * 2;
      this.tweens.add({ targets: koi, alpha: 0.95, duration: 400 });
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 2400,
        onUpdate: (tw) => {
          const a = start + (tw.getValue() ?? 0) * Math.PI * 1.6;
          koi.setPosition(POND_X + Math.cos(a) * r, POND_Y + Math.sin(a) * r * 0.28);
          koi.setRotation(a + Math.PI / 2);
        },
      });
    }
    for (let k = 0; k < 18; k++) {
      const p = this.add.image(800 + Phaser.Math.Between(-150, 150), Phaser.Math.Between(200, 600), `petal-${k % 5}`).setDepth(5);
      this.drifters.add(p, { vy: Phaser.Math.FloatBetween(-40, 30), vx: Phaser.Math.FloatBetween(-60, 60), sway: 40, spin: 1.5, life: 2.4, fadeFrom: 0.5 });
    }
    this.time.delayedCall(2400, () => {
      this.services.bus.emit('calibrated');
      this.scene.start(this.services.level);
    });
  }
}
