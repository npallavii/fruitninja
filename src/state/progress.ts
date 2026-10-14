import { load, remove, save } from './storage';
import type { LevelId, RoundResult } from './types';

export interface Progress {
  introSeen: boolean;
  bestScore: Record<LevelId, number>;
  totalFruits: number;
  totalFlowers: number;
  totalRounds: number;
  totalActiveSeconds: number;
  /** Garden keepsakes earned over many sessions (shown on the results screen). */
  keepsakes: string[];
}

const KEY = 'fruitopia.progress.v1';

export const EMPTY_PROGRESS: Progress = {
  introSeen: false,
  bestScore: { giggle: 0, waterway: 0, sky: 0 },
  totalFruits: 0,
  totalFlowers: 0,
  totalRounds: 0,
  totalActiveSeconds: 0,
  keepsakes: [],
};

export const KEEPSAKES = [
  { id: 'seed', name: 'Golden Seed', at: 1 },
  { id: 'badge-flower', name: 'Flower Badge', at: 3 },
  { id: 'butterfly', name: 'Butterfly Friend', at: 5 },
  { id: 'mushroom', name: 'Mushroom House', at: 8 },
  { id: 'bridge', name: 'Rainbow Bridge', at: 12 },
  { id: 'pond', name: 'Lily Pond', at: 16 },
] as const;

export function getProgress(): Progress {
  const p = load(KEY, EMPTY_PROGRESS);
  return { ...p, bestScore: { ...EMPTY_PROGRESS.bestScore, ...p.bestScore } };
}

export function markIntroSeen(): void {
  save(KEY, { ...getProgress(), introSeen: true });
}

/** Records a finished round. Returns whether it was a new best and any keepsake unlocked. */
export function recordRound(r: RoundResult): { newBest: boolean; unlocked: string | null } {
  const p = getProgress();
  const newBest = r.score > (p.bestScore[r.level] ?? 0);
  const totalRounds = p.totalRounds + 1;
  const reward = KEEPSAKES.find((k) => k.at === totalRounds && !p.keepsakes.includes(k.id));
  const next: Progress = {
    ...p,
    bestScore: { ...p.bestScore, [r.level]: Math.max(p.bestScore[r.level] ?? 0, r.score) },
    totalFruits: p.totalFruits + r.fruits,
    totalFlowers: p.totalFlowers + r.flowers,
    totalRounds,
    totalActiveSeconds: p.totalActiveSeconds + r.activeSeconds,
    keepsakes: reward ? [...p.keepsakes, reward.id] : p.keepsakes,
  };
  save(KEY, next);
  return { newBest, unlocked: reward ? reward.name : null };
}

export function resetProgress(): void {
  remove(KEY);
}
