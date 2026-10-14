import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../input/inputHub';
import { CalibrationScene } from './scenes/CalibrationScene';
import { GiggleGardenScene } from './scenes/GiggleGardenScene';
import { SkyScene } from './scenes/SkyScene';
import { WaterwayScene } from './scenes/WaterwayScene';
import type { GameServices } from './services';
import type { LevelId } from '../state/types';

export type StartScene = 'calibration' | LevelId;

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
  game.scene.add('waterway', new WaterwayScene(services), start === 'waterway');
  game.scene.add('sky', new SkyScene(services), start === 'sky');
  if (import.meta.env.DEV) Object.assign(window, { __fruitopia: { game, services } });
  return game;
}
