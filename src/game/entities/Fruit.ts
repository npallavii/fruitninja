import Phaser from 'phaser';
import { FRUIT_SPECS, type FruitKind } from '../../art/fruits';
import { GAME_H } from '../../input/inputHub';

export type FruitType = FruitKind | 'crystal';

const DISPLAY = 0.88; // canvas → game scale for the 220px fruit art
const BODY_R = 78; // body radius inside the canvas art
const KID_MARGIN = 22; // generous hit area so small arms succeed

export class Fruit {
  readonly img: Phaser.GameObjects.Image;
  readonly radius: number;
  readonly scale: number;
  vx: number;
  vy: number;
  spin: number;
  sliced = false;
  private age = 0;

  constructor(
    scene: Phaser.Scene,
    readonly type: FruitType,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) {
    const spec = type === 'crystal' ? null : FRUIT_SPECS[type];
    this.scale = DISPLAY * (spec?.scale ?? 0.9);
    this.radius = BODY_R * this.scale * (spec?.hit ?? 0.95) + KID_MARGIN;
    this.img = scene.add
      .image(x, y, type === 'crystal' ? 'crystal' : `fruit-${type}`)
      .setScale(this.scale)
      .setDepth(type === 'crystal' ? 12 : 10)
      .setRotation(Phaser.Math.FloatBetween(-0.3, 0.3));
    this.vx = vx;
    this.vy = vy;
    this.spin = type === 'crystal' ? 0 : Phaser.Math.FloatBetween(-1.1, 1.1);
  }

  get x(): number {
    return this.img.x;
  }

  get y(): number {
    return this.img.y;
  }

  update(dt: number, gravity: number): void {
    this.age += dt;
    this.vy += gravity * dt;
    this.img.x += this.vx * dt;
    this.img.y += this.vy * dt;
    if (this.type === 'crystal') {
      // gentle shimmer instead of spinning
      this.img.rotation = Math.sin(this.age * 2) * 0.12;
      this.img.setScale(this.scale * (1 + Math.sin(this.age * 4) * 0.04));
    } else {
      this.img.rotation += this.spin * dt;
    }
  }

  isGone(): boolean {
    return this.vy > 0 && this.img.y > GAME_H + 140;
  }

  destroy(): void {
    this.img.destroy();
  }
}
