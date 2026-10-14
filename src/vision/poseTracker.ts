// Real body tracking with MediaPipe Pose Landmarker (runs fully in the browser).
// Local copies of the WASM runtime and model are used when present (see scripts/setup-vision.mjs),
// otherwise it falls back to the public CDN.
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type Landmarks = NormalizedLandmark[];

const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const LOCAL_WASM = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const LOCAL_MODEL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`;

/** Dev servers answer unknown paths with index.html, so check the content type too. */
async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const type = res.headers.get('content-type') ?? '';
    return res.ok && !type.includes('text/html');
  } catch {
    return false;
  }
}

let shared: Promise<PoseLandmarker> | null = null;

async function createLandmarker(): Promise<PoseLandmarker> {
  const localWasm = await exists(`${LOCAL_WASM}/vision_wasm_internal.js`);
  const localModel = await exists(LOCAL_MODEL);
  const fileset = await FilesetResolver.forVisionTasks(localWasm ? LOCAL_WASM : CDN_WASM);
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: localModel ? LOCAL_MODEL : CDN_MODEL, delegate },
    runningMode: 'VIDEO' as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  try {
    return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return await PoseLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

/** The model is loaded once and reused between rounds. */
export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!shared) {
    shared = createLandmarker().catch((err) => {
      shared = null;
      throw err;
    });
  }
  return shared;
}

export class PoseTracker {
  private raf = 0;
  private running = false;
  private lastVideoTime = -1;

  constructor(
    private video: HTMLVideoElement,
    private onPose: (landmarks: Landmarks | null, timeMs: number) => void,
  ) {}

  async start(): Promise<void> {
    const landmarker = await loadPoseLandmarker();
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      const v = this.video;
      if (v.readyState >= 2 && v.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = v.currentTime;
        const now = performance.now();
        try {
          const result = landmarker.detectForVideo(v, now);
          this.onPose(result.landmarks?.[0] ?? null, now);
        } catch {
          /* a dropped frame is fine */
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/** MediaPipe pose landmark indices we use. */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftHip: 23,
  rightHip: 24,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;
