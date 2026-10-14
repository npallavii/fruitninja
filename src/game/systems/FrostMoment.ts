import Phaser from 'phaser';
import { audio } from '../../audio/audio';
import type { EventBus } from '../../state/bus';

const HOLD_SECONDS = 3;
const MAX_SECONDS = 10;

/**
 * "Morning Frost": a gentle replacement for the arcade freeze-bomb.
 * Frost creeps in at the edges, the world slows down, and the child holds a
 * statue pose for 3 seconds. Wobbling simply melts the frost — never a fail sound.
 */
export class FrostMoment {
  active = false;
  private overlay: Phaser.GameObjects.Image;
  private t = 0;
  private hold = 0;
  private lastEmit = 0;
  /** 1 = normal speed, lower = slow motion */
  timeScale = 1;

  constructor(
    private scene: Phaser.Scene,
    private bus: EventBus,
    private onDone: (cleared: boolean) => void,
  ) {
    this.overlay = scene.add.image(800, 450, 'frost').setDepth(30).setAlpha(0);
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.t = 0;
    this.hold = 0;
    audio.frostStart();
    audio.duck(true);
    this.scene.tweens.add({ targets: this.overlay, alpha: 0.92, duration: 1400, ease: 'Sine.easeOut' });
    this.bus.emit('frost', { phase: 'start', progress: 0 });
    this.bus.emit('pip', { text: 'Statue time! Hold still like a tree.', mood: 'calm' });
  }

  update(dt: number, still: boolean): void {
    const targetScale = this.active ? 0.25 : 1;
    this.timeScale += (targetScale - this.timeScale) * Math.min(1, dt * 4);
    if (!this.active) return;
    this.t += dt;
    if (this.t > 1.2) {
      if (still) this.hold += dt;
      else this.hold = Math.max(0, this.hold - dt * 0.6);
    }
    const progress = Math.min(1, this.hold / HOLD_SECONDS);
    this.overlay.alpha = 0.92 * (1 - progress * 0.35);
    if (this.t - this.lastEmit > 0.1) {
      this.lastEmit = this.t;
      this.bus.emit('frost', { phase: 'progress', progress });
    }
    if (this.hold >= HOLD_SECONDS) this.finish(true);
    else if (this.t >= MAX_SECONDS) this.finish(false);
  }

  private finish(cleared: boolean): void {
    this.active = false;
    audio.duck(false);
    if (cleared) audio.frostClear();
    this.scene.tweens.add({ targets: this.overlay, alpha: 0, duration: cleared ? 700 : 1600, ease: 'Sine.easeInOut' });
    this.bus.emit('frost', { phase: cleared ? 'cleared' : 'melted', progress: cleared ? 1 : 0 });
    this.bus.emit('pip', {
      text: cleared ? 'What a still statue! The frost sparkled away.' : 'The sun melted the frost. Let’s keep playing!',
      mood: cleared ? 'cheer' : 'happy',
    });
    this.onDone(cleared);
  }

  /** Stop instantly (round over). */
  cancel(): void {
    if (!this.active) return;
    this.active = false;
    audio.duck(false);
    this.overlay.setAlpha(0);
    this.bus.emit('frost', { phase: 'melted', progress: 0 });
  }
}
