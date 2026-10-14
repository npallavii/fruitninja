export type LevelId = 'giggle' | 'waterway' | 'sky';

export type InputMode = 'camera' | 'mouse';

export interface LevelInfo {
  id: LevelId;
  name: string;
  movement: string;
  blurb: string;
  available: boolean;
  /** the friend who talks during this world */
  companion: 'pip' | 'bloop' | 'misty';
}

export const LEVELS: LevelInfo[] = [
  {
    id: 'giggle',
    name: 'The Giggle Garden',
    movement: 'Arm movements',
    blurb: 'Swish your arms to slice floating fruit and wake up the sleepy flowers.',
    available: true,
    companion: 'pip',
  },
  {
    id: 'waterway',
    name: 'The Wiggly Waterway',
    movement: 'Swaying & side steps',
    blurb: 'Sway and side-step to steer Bloop’s basket boat and catch fruit floating down the river.',
    available: true,
    companion: 'bloop',
  },
  {
    id: 'sky',
    name: 'The Cloudberry Sky',
    movement: 'Reaching & jumping',
    blurb: 'Cloudberries fall from the clouds! Reach up or jump to catch them and build a rainbow bridge.',
    available: true,
    companion: 'misty',
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
