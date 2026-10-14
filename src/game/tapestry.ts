// The Living Tapestry: the painted background canvas behind the camera image.
// Every slice leaves a soft watercolor stain on it, so by the end of a round the
// child has painted their own garden picture.
import { getTextures, splashKey } from '../art/textures';
import { GAME_H, GAME_W } from '../input/inputHub';

export class Tapestry {
  private ctx: CanvasRenderingContext2D;

  constructor(
    readonly canvas: HTMLCanvasElement,
    base: HTMLCanvasElement,
  ) {
    canvas.width = GAME_W;
    canvas.height = GAME_H;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.drawImage(base, 0, 0, GAME_W, GAME_H);
  }

  /** Absorb a watercolor stain into the paper. */
  stain(x: number, y: number, colorIndex: number, size = 1, alpha = 0.32): void {
    const tex = getTextures().get(splashKey(colorIndex, Math.floor(Math.random() * 3)));
    if (!tex) return;
    const s = 230 * size;
    const ctx = this.ctx;
    ctx.save();
    // normal blending keeps stains pastel (multiply would turn pink-on-green brown)
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.drawImage(tex, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  /** Combine the paper with an overlay (e.g. a snapshot of the blooming flowers). */
  compose(overlay?: CanvasImageSource | null): string {
    const out = document.createElement('canvas');
    out.width = GAME_W;
    out.height = GAME_H;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(this.canvas, 0, 0);
    if (overlay) ctx.drawImage(overlay, 0, 0, GAME_W, GAME_H);
    return out.toDataURL('image/jpeg', 0.9);
  }
}
