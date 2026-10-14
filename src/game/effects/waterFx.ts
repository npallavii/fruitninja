import Phaser from 'phaser';
import { splashKey } from '../../art/textures';
import type { Tapestry } from '../tapestry';
import type { Drifters } from './Drifters';

/** Soft rings spreading over water (flattened for perspective). */
export function rippleAt(scene: Phaser.Scene, x: number, y: number, reducedMotion: boolean, rings = 2): void {
  const n = reducedMotion ? 1 : rings;
  for (let k = 0; k < n; k++) {
    const r = scene.add.image(x, y, 'ripple').setDepth(8).setScale(0.15, 0.06).setAlpha(0.9);
    scene.tweens.add({
      targets: r,
      scaleX: 1.25,
      scaleY: 0.45,
      alpha: 0,
      duration: 1300,
      delay: k * 240,
      ease: 'Sine.easeOut',
      onComplete: () => r.destroy(),
    });
  }
}

/** A watercolour splash: juice bloom + water droplets + ripples + a stain on the paper. */
export function splashFx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  juiceIndex: number,
  drifters: Drifters,
  tapestry: Tapestry,
  reducedMotion: boolean,
): void {
  const WATER = 6; // slate-blue splash colour
  for (const [ci, s] of [
    [juiceIndex, 1.0],
    [WATER, 0.8],
  ] as const) {
    const b = scene.add
      .image(x, y - 20, splashKey(ci, Phaser.Math.Between(0, 2)))
      .setDepth(9)
      .setAlpha(0.85)
      .setScale(0.3)
      .setRotation(Math.random() * Math.PI * 2);
    scene.tweens.add({ targets: b, scale: s, duration: 500, ease: 'Cubic.easeOut' });
    scene.tweens.add({ targets: b, alpha: 0, duration: 1100, delay: 250, onComplete: () => b.destroy() });
  }
  const drops = reducedMotion ? 3 : 7;
  for (let k = 0; k < drops; k++) {
    const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.1, 1.1);
    const sp = Phaser.Math.FloatBetween(180, 340);
    const d = scene.add
      .image(x, y - 10, splashKey(k % 2 ? WATER : juiceIndex, k % 3))
      .setDepth(9)
      .setScale(Phaser.Math.FloatBetween(0.06, 0.11))
      .setAlpha(0.9);
    drifters.add(d, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gravity: 620, life: 1.1, fadeFrom: 0.4 });
  }
  rippleAt(scene, x, y + 10, reducedMotion);
  tapestry.stain(x, y, juiceIndex, 0.9, 0.38);
}
