import { load, save } from './storage';

export type Sensitivity = 'gentle' | 'normal' | 'zippy';

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  /** How visible the child's camera image is: 0 = "Garden only", 1 = fully visible. */
  cameraOpacity: number;
  sensitivity: Sensitivity;
  roundSeconds: number;
  reducedMotion: boolean;
}

const KEY = 'fruitopia.settings.v1';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  cameraOpacity: 0.75,
  sensitivity: 'gentle',
  roundSeconds: 60,
  reducedMotion: !!prefersReducedMotion,
};

type Listener = (s: Settings) => void;

class SettingsStore {
  private value: Settings = load(KEY, DEFAULT_SETTINGS);
  private listeners = new Set<Listener>();

  get(): Settings {
    return this.value;
  }

  update(patch: Partial<Settings>): void {
    this.value = { ...this.value, ...patch };
    save(KEY, this.value);
    this.listeners.forEach((l) => l(this.value));
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const settings = new SettingsStore();

/** Minimum hand speed (game px / second) that counts as a slicing swipe. */
export function sliceSpeedFor(s: Sensitivity): number {
  return s === 'gentle' ? 420 : s === 'normal' ? 650 : 900;
}
