import Phaser from 'phaser';
import { FRUIT_SPECS } from '../../art/fruits';
import { FLOWER_COLORS, splashIndexFor, splashKey } from '../../art/textures';
import type { Fruit } from '../entities/Fruit';
import type { Tapestry } from '../tapestry';
import type { Drifters } from './Drifters';

/**
 * A fruit is sliced: two halves drift apart, a soft watercolor bloom opens,
 * a few juice drops and petals float away, and the paper absorbs a stain.
 * No flashes, no shakes.
 */
export function sliceFruitFx(
  scene: Phaser.Scene,
  fruit: Fruit,
  angle: number,
  drifters: Drifters,
  tapestry: Tapestry,
  reducedMotion: boolean,
): void {
  if (fruit.type === 'crystal') return;
  const spec = FRUIT_SPECS[fruit.type];
  const ci = splashIndexFor(spec.juice);
  const { x, y } = fruit;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const sep = reducedMotion ? 50 : 95;

  // halves — the cut in the texture is horizontal, so rotate it onto the swipe line
  (['top', 'bottom'] as const).forEach((part, i) => {
    const dir = i === 0 ? -1 : 1;
    const half = scene.add
      .image(x, y, `fruit-${fruit.type}-${part}`)
      .setScale(fruit.scale)
      .setRotation(angle)
      .setDepth(11);
    drifters.add(half, {
      vx: fruit.vx * 0.35 + nx * sep * dir,
      vy: Math.min(fruit.vy * 0.3, 40) + ny * sep * dir - 60,
      spin: dir * Phaser.Math.FloatBetween(0.4, 1.2),
      gravity: 620,
      life: 1.8,
      fadeFrom: 0.45,
    });
  });

  // watercolor bloom
  const bloom = scene.add
    .image(x, y, splashKey(ci, Phaser.Math.Between(0, 2)))
    .setDepth(9)
    .setAlpha(0.9)
    .setScale(0.35)
    .setRotation(Math.random() * Math.PI * 2);
  scene.tweens.add({ targets: bloom, scale: 1.15, duration: 520, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: bloom, alpha: 0, duration: 1100, delay: 250, ease: 'Sine.easeIn', onComplete: () => bloom.destroy() });

  // juice drops
  const drops = reducedMotion ? 2 : 5;
  for (let k = 0; k < drops; k++) {
    const a = angle + Phaser.Math.FloatBetween(-1.2, 1.2) + (k % 2 ? Math.PI : 0);
    const sp = Phaser.Math.FloatBetween(90, 220);
    const d = scene.add
      .image(x, y, splashKey(ci, k % 3))
      .setScale(Phaser.Math.FloatBetween(0.07, 0.13))
      .setDepth(9)
      .setAlpha(0.85);
    drifters.add(d, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, gravity: 380, drag: 1.2, life: 1.2, fadeFrom: 0.3 });
  }

  // petals
  if (!reducedMotion) {
    for (let k = 0; k < 3; k++) {
      const p = scene.add
        .image(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 20), `petal-${Phaser.Math.Between(0, FLOWER_COLORS.length - 1)}`)
        .setDepth(13)
        .setScale(Phaser.Math.FloatBetween(0.6, 0.95));
      drifters.add(p, {
        vx: Phaser.Math.FloatBetween(-70, 70),
        vy: Phaser.Math.FloatBetween(-120, -40),
        gravity: 70,
        drag: 0.4,
        sway: 40,
        spin: Phaser.Math.FloatBetween(-2, 2),
        life: 2.6,
        fadeFrom: 0.5,
      });
    }
  }

  tapestry.stain(x, y, ci, Phaser.Math.FloatBetween(0.8, 1.1), 0.42);
}

/** Small soft "+10" that rises and fades — legible but never shouty. */
export function floatScore(scene: Phaser.Scene, x: number, y: number, text: string): void {
  const t = scene.add
    .text(x, y - 30, text, { fontFamily: 'Fredoka, Nunito, sans-serif', fontSize: '34px', color: '#7A6468', fontStyle: '600' })
    .setOrigin(0.5)
    .setDepth(25)
    .setAlpha(0);
  t.setStroke('#FFF8EE', 6);
  scene.tweens.add({ targets: t, alpha: 0.9, y: y - 60, duration: 300, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 100, duration: 700, delay: 450, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
}

/** Sparkly petal shower (frost cleared, round end). */
export function petalShower(scene: Phaser.Scene, drifters: Drifters, count: number, area = { x: 0, w: 1600 }): void {
  for (let k = 0; k < count; k++) {
    const p = scene.add
      .image(area.x + Math.random() * area.w, -20 - Math.random() * 200, Math.random() < 0.25 ? 'sparkle' : `petal-${k % FLOWER_COLORS.length}`)
      .setDepth(26)
      .setScale(Phaser.Math.FloatBetween(0.6, 1.1));
    drifters.add(p, { vy: Phaser.Math.FloatBetween(60, 130), sway: 50, spin: Phaser.Math.FloatBetween(-1.5, 1.5), life: 8, fadeFrom: 0.7 });
  }
}
