import type { HudState, RoundResult } from './types';

/** Everything the Phaser game tells the React UI (and vice versa). */
export interface GameEvents {
  hud: HudState;
  pip: { text: string; mood?: 'happy' | 'cheer' | 'calm' };
  combo: { count: number };
  calibration: { message: string; progress: number; ok: boolean };
  calibrated: void;
  tracking: { visible: boolean };
  frost: { phase: 'start' | 'progress' | 'cleared' | 'melted'; progress: number };
  roundEnd: RoundResult;
  pause: void;
  resume: void;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<unknown>>>();

  on<K extends keyof GameEvents>(type: K, h: Handler<GameEvents[K]>): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(h as Handler<unknown>);
    return () => this.handlers.get(type)?.delete(h as Handler<unknown>);
  }

  emit<K extends keyof GameEvents>(type: K, ...payload: GameEvents[K] extends void ? [] : [GameEvents[K]]): void {
    this.handlers.get(type)?.forEach((h) => h(payload[0]));
  }

  clear(): void {
    this.handlers.clear();
  }
}
