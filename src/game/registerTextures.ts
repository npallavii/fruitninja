import type Phaser from 'phaser';
import { getTextures } from '../art/textures';

/** Registers every procedurally painted texture with a scene's texture manager (once). */
export function registerTextures(scene: Phaser.Scene): void {
  for (const [key, canvas] of getTextures()) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
  }
}
