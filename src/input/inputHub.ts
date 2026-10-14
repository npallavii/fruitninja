// Turns body landmarks (or the mouse / a finger) into two "magic hands" in game coordinates.
// The game only ever reads from here, so camera and mouse play work identically.
import { OneEuro } from '../vision/oneEuro';
import { LM, type Landmarks } from '../vision/poseTracker';

export const GAME_W = 1600;
export const GAME_H = 900;

export interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export interface Hand {
  id: number;
  x: number;
  y: number;
  visible: boolean;
  /** smoothed speed in game px per second */
  speed: number;
  lastT: number;
  trail: TrailPoint[];
  /** position last time the slicing system looked (for segment collision) */
  sliceX: number;
  sliceY: number;
}

const TRAIL_MS = 1000;

function makeHand(id: number): Hand {
  return { id, x: GAME_W / 2, y: GAME_H / 2, visible: false, speed: 0, lastT: 0, trail: [], sliceX: NaN, sliceY: NaN };
}

export class InputHub {
  readonly hands: Hand[] = [makeHand(0), makeHand(1)];
  mode: 'pose' | 'mouse' = 'mouse';
  bodyVisible = false;
  lastBodyAt = 0;
  landmarks: Landmarks | null = null;
  /** How much the whole body is moving (px/s). Low = holding still. */
  stillness = 0;
  video: HTMLVideoElement | null = null;

  private filters = [0, 1].map(() => [new OneEuro(), new OneEuro()]);
  private prevBody: { x: number; y: number }[] | null = null;
  private prevBodyT = 0;

  // ------------------------------------------------------------- mouse / touch

  setPointer(x: number, y: number, tMs: number): void {
    this.mode = 'mouse';
    this.bodyVisible = true;
    this.lastBodyAt = tMs;
    this.sample(this.hands[0], x, y, tMs);
  }

  // ------------------------------------------------------------- pose

  /** Map a normalised camera landmark into game space (mirrored, object-fit: cover). */
  toGame(nx: number, ny: number): { x: number; y: number } {
    const vw = this.video?.videoWidth || 1280;
    const vh = this.video?.videoHeight || 720;
    const scale = Math.max(GAME_W / vw, GAME_H / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    return { x: (GAME_W - dw) / 2 + (1 - nx) * dw, y: (GAME_H - dh) / 2 + ny * dh };
  }

  setPose(lm: Landmarks | null, tMs: number): void {
    this.mode = 'pose';
    this.landmarks = lm;
    if (!lm) {
      if (tMs - this.lastBodyAt > 400) {
        this.bodyVisible = false;
        this.hands.forEach((h) => (h.visible = false));
        this.prevBody = null;
      }
      return;
    }
    this.bodyVisible = true;
    this.lastBodyAt = tMs;
    const t = tMs / 1000;

    const sides = [
      { wrist: LM.leftWrist, index: LM.leftIndex, pinky: LM.leftPinky },
      { wrist: LM.rightWrist, index: LM.rightIndex, pinky: LM.rightPinky },
    ];
    sides.forEach((s, i) => {
      const hand = this.hands[i];
      const w = lm[s.wrist];
      if (!w || (w.visibility ?? 1) < 0.4) {
        hand.visible = false;
        this.filters[i].forEach((f) => f.reset());
        hand.sliceX = NaN;
        return;
      }
      const wg = this.toGame(w.x, w.y);
      let px = wg.x;
      let py = wg.y;
      const ix = lm[s.index];
      const pk = lm[s.pinky];
      if (ix && pk && (ix.visibility ?? 1) > 0.3 && (pk.visibility ?? 1) > 0.3) {
        // aim a little past the knuckles so the "blade" sits in the palm
        const m = this.toGame((ix.x + pk.x) / 2, (ix.y + pk.y) / 2);
        px = m.x + (m.x - wg.x) * 0.4;
        py = m.y + (m.y - wg.y) * 0.4;
      }
      const [fx, fy] = this.filters[i];
      this.sample(hand, fx.filter(px, t), fy.filter(py, t), tMs);
    });

    // whole-body movement energy, used for the "statue pose"
    const keys = [LM.nose, LM.leftShoulder, LM.rightShoulder, LM.leftWrist, LM.rightWrist, LM.leftHip, LM.rightHip];
    const pts = keys.map((k) => this.toGame(lm[k].x, lm[k].y));
    if (this.prevBody) {
      const dt = Math.max(0.016, (tMs - this.prevBodyT) / 1000);
      let sum = 0;
      pts.forEach((p, i) => (sum += Math.hypot(p.x - this.prevBody![i].x, p.y - this.prevBody![i].y)));
      const v = sum / pts.length / dt;
      this.stillness = this.stillness * 0.75 + v * 0.25;
    }
    this.prevBody = pts;
    this.prevBodyT = tMs;
  }

  // ------------------------------------------------------------- shared

  private sample(hand: Hand, x: number, y: number, tMs: number): void {
    if (hand.visible && hand.lastT > 0) {
      const dt = Math.max(0.008, (tMs - hand.lastT) / 1000);
      const inst = Math.hypot(x - hand.x, y - hand.y) / dt;
      hand.speed = hand.speed * 0.35 + inst * 0.65;
    } else {
      hand.speed = 0;
      hand.sliceX = x;
      hand.sliceY = y;
    }
    hand.x = x;
    hand.y = y;
    hand.visible = true;
    hand.lastT = tMs;
    hand.trail.push({ x, y, t: tMs });
    if (this.mode === 'mouse') this.stillness = this.stillness * 0.7 + hand.speed * 0.3;
  }

  /** Called every game frame. */
  tick(nowMs: number): void {
    for (const h of this.hands) {
      while (h.trail.length && nowMs - h.trail[0].t > TRAIL_MS) h.trail.shift();
      const idle = nowMs - h.lastT;
      if (idle > 60) h.speed *= 0.82; // no new samples → hand is slowing down
      if (this.mode === 'mouse' && idle > 60) this.stillness *= 0.85;
    }
  }

  anyHandMoving(min = 140): boolean {
    return this.hands.some((h) => h.visible && h.speed > min);
  }

  reset(): void {
    this.hands.forEach((h, i) => Object.assign(h, makeHand(i)));
    this.filters.forEach((fs) => fs.forEach((f) => f.reset()));
    this.prevBody = null;
    this.stillness = 0;
  }
}
