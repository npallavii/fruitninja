import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../input/inputHub';
import { CalibrationScene } from './scenes/CalibrationScene';
import { GiggleGardenScene } from './scenes/GiggleGardenScene';
import type { GameServices } from './services';

export type StartScene = 'calibration' | 'giggle';

/** Creates the Phaser game on a transparent canvas layered over the painted paper + camera. */
export function createGame(parent: HTMLElement, services: GameServices, start: StartScene): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_W,
    height: GAME_H,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 },
    scene: [],
  });
  game.scene.add('calibration', new CalibrationScene(services), start === 'calibration');
  game.scene.add('giggle', new GiggleGardenScene(services), start === 'giggle');
  if (import.meta.env.DEV) Object.assign(window, { __fruitopia: { game, services } });
  return game;
}
