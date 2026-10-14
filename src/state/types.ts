export type LevelId = 'giggle' | 'waterway' | 'sky';

export type InputMode = 'camera' | 'mouse';

export interface LevelInfo {
  id: LevelId;
  name: string;
  movement: string;
  blurb: string;
  available: boolean;
}

export const LEVELS: LevelInfo[] = [
  {
    id: 'giggle',
    name: 'The Giggle Garden',
    movement: 'Arm movements',
    blurb: 'Swish your arms to slice floating fruit and wake up the sleepy flowers.',
    available: true,
  },
  {
    id: 'waterway',
    name: 'The Wiggly Waterway',
    movement: 'Legs & balance',
    blurb: 'Step and stomp beside the river to splash the rolling melons.',
    available: false,
  },
  {
    id: 'sky',
    name: 'The Cloudberry Sky',
    movement: 'Reaching & jumping',
    blurb: 'Reach up high to pop the floating lantern fruits.',
    available: false,
  },
];

export interface RoundResult {
  level: LevelId;
  score: number;
  fruits: number;
  bestCombo: number;
  combos: number;
  flowers: number;
  activeSeconds: number;
  frostCleared: number;
  /** PNG data URL of the painted garden, for the results frame. */
  painting: string | null;
}

export interface HudState {
  score: number;
  secondsLeft: number;
  fruits: number;
  flowers: number;
}
