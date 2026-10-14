import type { LevelId } from '../state/types';
import { LM, type Landmarks } from './poseTracker';

export interface CalibrationCheck {
  ok: boolean;
  message: string;
}

const seen = (lm: Landmarks, i: number, min = 0.5) => {
  const p = lm[i];
  return !!p && (p.visibility ?? 1) >= min && p.x > 0.01 && p.x < 0.99 && p.y > 0.01 && p.y < 0.99;
};

/** "The Stepping Stone": is the child standing where the game can see them well? */
export function checkPlacement(lm: Landmarks | null, _level: LevelId = 'giggle'): CalibrationCheck {
  if (!lm) return { ok: false, message: "Pip can't see you yet — stand in front of the camera!" };
  const shoulders = seen(lm, LM.leftShoulder) && seen(lm, LM.rightShoulder);
  if (!shoulders || !seen(lm, LM.nose)) return { ok: false, message: 'Stand in front of the camera so Pip can see you.' };

  const sw = Math.abs(lm[LM.leftShoulder].x - lm[LM.rightShoulder].x);
  if (sw > 0.36) return { ok: false, message: 'Take a big step back!' };
  if (!seen(lm, LM.leftHip, 0.4) || !seen(lm, LM.rightHip, 0.4))
    return { ok: false, message: 'Step back a little so Pip can see more of you.' };
  if (sw < 0.09) return { ok: false, message: 'Come a little closer!' };

  const cx = (lm[LM.leftShoulder].x + lm[LM.rightShoulder].x) / 2;
  if (cx < 0.3 || cx > 0.7) return { ok: false, message: 'Step toward the middle of the pond.' };

  if (!seen(lm, LM.leftWrist, 0.4) && !seen(lm, LM.rightWrist, 0.4))
    return { ok: false, message: 'Wave your hands so Pip can see them!' };

  return { ok: true, message: 'Perfect! Stay on the stepping stone…' };
}
