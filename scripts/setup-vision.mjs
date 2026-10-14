// Copies the MediaPipe WASM runtime into /public and downloads the pose model,
// so body tracking works from localhost without relying on a CDN at play time.
// If anything fails, the game falls back to the CDN automatically.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDst = join(root, 'public', 'mediapipe', 'wasm');
const modelDir = join(root, 'public', 'models');
const modelPath = join(modelDir, 'pose_landmarker_lite.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

try {
  if (existsSync(wasmSrc)) {
    mkdirSync(wasmDst, { recursive: true });
    cpSync(wasmSrc, wasmDst, { recursive: true });
    console.log('[fruitopia] MediaPipe WASM copied to public/mediapipe/wasm');
  } else {
    console.warn('[fruitopia] MediaPipe WASM not found yet — run `npm run setup:vision` after install.');
  }
} catch (err) {
  console.warn('[fruitopia] Could not copy WASM (CDN fallback will be used):', err.message);
}

if (existsSync(modelPath)) {
  console.log('[fruitopia] Pose model already present');
} else {
  try {
    mkdirSync(modelDir, { recursive: true });
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log('[fruitopia] Pose model downloaded to public/models');
  } catch (err) {
    console.warn('[fruitopia] Could not download pose model (CDN fallback will be used):', err.message);
  }
}
