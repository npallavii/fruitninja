import Phaser from 'phaser';

/** Lightweight floaty particles: fruit halves, juice drops, petals, sparkles. */
interface Drifter {
  obj: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
  gravity: number;
  drag: number;
  life: number;
  age: number;
  fadeFrom: number;
  sway: number;
  phase: number;
  baseAlpha: number;
}

export class Drifters {
  private items: Drifter[] = [];

  constructor(private scene: Phaser.Scene) {}

  add(
    obj: Phaser.GameObjects.Image,
    o: Partial<Omit<Drifter, 'obj' | 'age' | 'baseAlpha'>> & { life: number },
  ): void {
    this.items.push({
      obj,
      vx: 0,
      vy: 0,
      spin: 0,
      gravity: 0,
      drag: 0,
      fadeFrom: 0.6,
      sway: 0,
      phase: Math.random() * Math.PI * 2,
      ...o,
      age: 0,
      baseAlpha: obj.alpha,
    });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const d = this.items[i];
      d.age += dt;
      d.vy += d.gravity * dt;
      if (d.drag) {
        const k = Math.max(0, 1 - d.drag * dt);
        d.vx *= k;
        d.vy *= k;
      }
      const swayX = d.sway ? Math.sin(d.age * 2.4 + d.phase) * d.sway : 0;
      d.obj.x += (d.vx + swayX) * dt;
      d.obj.y += d.vy * dt;
      d.obj.rotation += d.spin * dt;
      const t = d.age / d.life;
      if (t > d.fadeFrom) d.obj.alpha = d.baseAlpha * Math.max(0, 1 - (t - d.fadeFrom) / (1 - d.fadeFrom));
      if (d.age >= d.life || d.obj.y > this.scene.scale.height + 200) {
        d.obj.destroy();
        this.items.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.items.forEach((d) => d.obj.destroy());
    this.items = [];
  }
}
