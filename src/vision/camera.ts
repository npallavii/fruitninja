export type CameraError = 'denied' | 'notfound' | 'insecure' | 'busy' | 'unknown';

export class CameraStartError extends Error {
  constructor(public kind: CameraError, message: string) {
    super(message);
  }
}

/** Starts the front camera and plays it into `video`. */
export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new CameraStartError('insecure', 'The camera only works on localhost or an https:// address.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraStartError('notfound', 'This browser cannot use a camera.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError')
      throw new CameraStartError('denied', 'Camera permission was not given.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError')
      throw new CameraStartError('notfound', 'No camera was found.');
    if (name === 'NotReadableError') throw new CameraStartError('busy', 'Another app is using the camera.');
    throw new CameraStartError('unknown', String(err));
  }
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.onloadeddata = () => resolve();
  });
  await video.play().catch(() => undefined);
  return stream;
}

export function stopCamera(video: HTMLVideoElement | null, stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}

/** Average brightness (0–255) of the camera image, sampled tiny and cheaply. */
const probe = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function measureBrightness(video: HTMLVideoElement): number | null {
  if (!probe || video.readyState < 2) return null;
  probe.width = 32;
  probe.height = 18;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, 32, 18);
  const d = ctx.getImageData(0, 0, 32, 18).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  return sum / (d.length / 4);
}
