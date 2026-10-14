import { useCallback, useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { levelCanvas } from '../art/backgrounds';
import { fruitDataUrl } from '../art/fruits';
import { paperGrainDataUrl } from '../art/watercolor';
import { audio } from '../audio/audio';
import { createGame } from '../game/createGame';
import { Tapestry } from '../game/tapestry';
import { InputHub } from '../input/inputHub';
import { EventBus, type GameEvents } from '../state/bus';
import { settings } from '../state/settings';
import { LEVELS, type HudState, type InputMode, type LevelId, type RoundResult } from '../state/types';
import { CameraStartError, measureBrightness, startCamera, stopCamera } from '../vision/camera';
import { PoseTracker } from '../vision/poseTracker';
import { Pip, type Mood } from './Characters';
import { ClockIcon, FlowerIcon, GearIcon, HandIcon, HomeIcon, PauseIcon, PlayIcon, ReplayIcon } from './Icons';
import { Button, SpeechBubble } from './ui';

type Phase = 'starting' | 'loading' | 'calibrating' | 'playing' | 'error';

const ERROR_TEXT: Record<string, string> = {
  denied: 'Pip needs permission to use the camera. Click the camera icon in the address bar, choose “Allow”, then try again.',
  notfound: 'Pip couldn’t find a camera. Plug one in, or play with the mouse instead.',
  busy: 'Another app is using the camera. Close it, then try again.',
  insecure: 'The camera only works on localhost or a secure https:// address.',
  model: 'Pip’s magic eyes couldn’t load. Check the internet connection, then try again.',
  unknown: 'Something went wrong with the camera. Let’s try again.',
};

interface Props {
  level: LevelId;
  mode: InputMode;
  onEnd: (r: RoundResult) => void;
  onHome: () => void;
  onRestart: () => void;
  onUseMouse: () => void;
  onSettings: () => void;
  settingsOpen: boolean;
}

export function GameScreen({ level, mode, onEnd, onHome, onRestart, onUseMouse, onSettings, settingsOpen }: Props) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string>('unknown');
  const [hud, setHud] = useState<HudState>({ score: 0, secondsLeft: settings.get().roundSeconds, fruits: 0, flowers: 0 });
  const [pip, setPip] = useState<{ text: string; mood: Mood; id: number } | null>(null);
  const [calib, setCalib] = useState<GameEvents['calibration']>({ message: 'Getting ready…', progress: 0, ok: false });
  const [frost, setFrost] = useState<GameEvents['frost'] | null>(null);
  const [combo, setCombo] = useState<{ count: number; id: number } | null>(null);
  const [lost, setLost] = useState(false);
  const [dim, setDim] = useState(false);
  const [paused, setPaused] = useState(false);
  const [opacity, setOpacity] = useState(settings.get().cameraOpacity);

  useEffect(() => settings.subscribe((s) => setOpacity(s.cameraOpacity)), []);

  // ------------------------------------------------------------- boot / teardown
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;
    let tracker: PoseTracker | null = null;
    let brightTimer = 0;
    const video = videoRef.current!;
    const bus = new EventBus();
    const hub = new InputHub();
    hub.video = video;
    const tapestry = new Tapestry(bgRef.current!, levelCanvas(level));
    const services = { bus, hub, tapestry, mode, level };

    setPhase(mode === 'camera' ? 'starting' : 'playing');
    setPaused(false);
    setLost(mode === 'camera');
    setFrost(null);

    bus.on('hud', setHud);
    bus.on('pip', (p) => setPip({ text: p.text, mood: p.mood ?? 'happy', id: performance.now() }));
    bus.on('calibration', setCalib);
    bus.on('calibrated', () => setPhase('playing'));
    bus.on('tracking', ({ visible }) => setLost(!visible));
    bus.on('combo', ({ count }) => setCombo({ count, id: performance.now() }));
    bus.on('frost', (f) => setFrost(f.phase === 'cleared' || f.phase === 'melted' ? { ...f } : f));
    bus.on('roundEnd', (r) => onEndRef.current(r));

    const boot = async () => {
      if (mode === 'camera') {
        try {
          stream = await startCamera(video);
        } catch (e) {
          if (disposed) return;
          setError(e instanceof CameraStartError ? e.kind : 'unknown');
          setPhase('error');
          return;
        }
        if (disposed) return stopCamera(video, stream);
        setPhase('loading');
        tracker = new PoseTracker(video, (lm, t) => hub.setPose(lm, t));
        try {
          await tracker.start();
        } catch {
          if (disposed) return;
          setError('model');
          setPhase('error');
          return;
        }
        if (disposed) return;
        brightTimer = window.setInterval(() => {
          const b = measureBrightness(video);
          setDim(b !== null && b < 48);
        }, 2000);
        gameRef.current = createGame(phaserRef.current!, services, 'calibration');
        setPhase('calibrating');
      } else {
        gameRef.current = createGame(phaserRef.current!, services, 'giggle');
      }
    };
    void boot();

    return () => {
      disposed = true;
      window.clearInterval(brightTimer);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      tracker?.stop();
      stopCamera(video, stream);
      bus.clear();
      audio.stopMusic();
      audio.duck(false);
    };
  }, [level, mode, attempt]);

  // ------------------------------------------------------------- pause
  const setGamePaused = useCallback((p: boolean) => {
    const game = gameRef.current;
    if (game) {
      for (const s of game.scene.getScenes(false)) {
        if (p && s.sys.isActive()) game.scene.pause(s.sys.settings.key);
        if (!p && s.sys.isPaused()) game.scene.resume(s.sys.settings.key);
      }
    }
    setPaused(p);
  }, []);

  useEffect(() => {
    if (settingsOpen) setGamePaused(true);
  }, [settingsOpen, setGamePaused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setGamePaused(!paused);
    };
    const onHide = () => document.hidden && setGamePaused(true);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [paused, setGamePaused]);

  // Pip's bubble fades after a few seconds
  useEffect(() => {
    if (!pip) return;
    const id = window.setTimeout(() => setPip(null), 3400);
    return () => window.clearTimeout(id);
  }, [pip]);

  useEffect(() => {
    if (!combo) return;
    const id = window.setTimeout(() => setCombo(null), 1900);
    return () => window.clearTimeout(id);
  }, [combo]);

  useEffect(() => {
    if (!frost || (frost.phase !== 'cleared' && frost.phase !== 'melted')) return;
    const id = window.setTimeout(() => setFrost(null), 1600);
    return () => window.clearTimeout(id);
  }, [frost]);

  // ------------------------------------------------------------- render
  const cameraVisible = mode === 'camera' && (phase === 'calibrating' || phase === 'playing' || phase === 'loading');
  const videoOpacity = !cameraVisible ? 0 : phase === 'playing' ? opacity : Math.max(opacity, 0.7);
  const levelName = LEVELS.find((l) => l.id === level)?.name ?? '';
  const mm = Math.floor(hud.secondsLeft / 60);
  const ss = String(hud.secondsLeft % 60).padStart(2, '0');

  return (
    <div className="game-screen">
      <div className="stage">
        <canvas ref={bgRef} className="stage__paper" />
        <video ref={videoRef} className="stage__video" style={{ opacity: videoOpacity }} muted playsInline />
        <div className="stage__grain" style={{ backgroundImage: `url(${paperGrainDataUrl()})`, opacity: videoOpacity * 0.45 }} />
        <div ref={phaserRef} className="stage__phaser" />

        {/* ---------- HUD ---------- */}
        {phase === 'playing' && (
          <div className="hud">
            <div className="pill pill--score">
              <img src={fruitDataUrl('orange')} alt="" width={40} />
              <span>{hud.score}</span>
            </div>
            <div className="pill pill--level">
              <FlowerIcon size={26} />
              <span>{levelName}</span>
              <span className="pill__flowers">{hud.flowers}</span>
            </div>
            <div className="hud__right">
              <div className={`pill pill--time ${hud.secondsLeft <= 10 ? 'is-low' : ''}`}>
                <ClockIcon size={26} />
                <span>
                  {mm}:{ss}
                </span>
              </div>
              <Button size="sm" tone="apricot" icon={<PauseIcon size={24} />} onClick={() => setGamePaused(true)} ariaLabel="Pause" />
            </div>
          </div>
        )}

        {mode === 'camera' && (phase === 'playing' || phase === 'calibrating') && (
          <div className={`cam-chip ${lost ? 'is-lost' : ''}`}>
            <span className="cam-chip__dot" />
            {lost ? 'Looking for you…' : 'Pip can see you'}
          </div>
        )}

        {/* ---------- Pip companion ---------- */}
        {(phase === 'playing' || phase === 'calibrating') && (
          <div className="game-pip">
            {pip && (
              <SpeechBubble key={pip.id} side="right">
                {pip.text}
              </SpeechBubble>
            )}
            <Pip mood={pip?.mood ?? 'happy'} size={150} />
          </div>
        )}

        {/* ---------- calibration ---------- */}
        {phase === 'calibrating' && (
          <div className="calib">
            <h2>The Stepping Stone</h2>
            <p className={calib.ok ? 'is-ok' : ''}>{calib.message}</p>
            <div className="calib__bar">
              <span style={{ width: `${Math.round(calib.progress * 100)}%` }} />
            </div>
            <button type="button" className="link-btn" onClick={onUseMouse}>
              Play with mouse instead
            </button>
          </div>
        )}

        {/* ---------- loading ---------- */}
        {(phase === 'starting' || phase === 'loading') && (
          <div className="center-card card">
            <div className="leaf-spinner" />
            <h2>{phase === 'starting' ? 'Opening the camera…' : 'Pip is opening his magic eyes…'}</h2>
            <p>{phase === 'starting' ? 'If your browser asks, choose “Allow”.' : 'This takes a few seconds the first time.'}</p>
          </div>
        )}

        {/* ---------- errors ---------- */}
        {phase === 'error' && (
          <div className="center-card card">
            <Pip mood="calm" size={120} />
            <h2>Oh! A little hiccup</h2>
            <p>{ERROR_TEXT[error] ?? ERROR_TEXT.unknown}</p>
            <div className="row">
              <Button tone="matcha" icon={<ReplayIcon size={22} />} onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </Button>
              <Button tone="lavender" icon={<HandIcon size={22} />} onClick={onUseMouse}>
                Use mouse
              </Button>
            </div>
          </div>
        )}

        {/* ---------- gentle moments ---------- */}
        {combo && (
          <div key={combo.id} className="combo-toast">
            <span className="combo-toast__rainbow" />
            Calligraphy Flow ×{combo.count}
          </div>
        )}

        {frost && (
          <div className={`frost-card ${frost.phase === 'cleared' ? 'is-cleared' : ''}`}>
            <svg viewBox="0 0 100 100" className="ring">
              <circle cx="50" cy="50" r="42" className="ring__track" />
              <circle cx="50" cy="50" r="42" className="ring__fill" style={{ strokeDashoffset: 264 * (1 - frost.progress) }} />
            </svg>
            <div>
              <h3>{frost.phase === 'cleared' ? 'Beautiful statue!' : frost.phase === 'melted' ? 'All melted!' : 'Statue time!'}</h3>
              <p>{frost.phase === 'start' || frost.phase === 'progress' ? 'Hold still like a tree… 1, 2, 3' : 'Let’s keep playing'}</p>
            </div>
          </div>
        )}

        {lost && phase === 'playing' && !paused && !frost && (
          <div className="center-card card card--soft">
            <h2>Where did you go?</h2>
            <p>Step back into the garden so Pip can see you. The game waits for you.</p>
          </div>
        )}

        {dim && mode === 'camera' && phase !== 'error' && <div className="dim-hint">It’s a little dark — turning on a light helps Pip see you.</div>}

        {/* ---------- pause ---------- */}
        {paused && !settingsOpen && (
          <div className="pause">
            <div className="card pause__card">
              <h2>Taking a little rest</h2>
              <div className="pause__actions">
                <Button size="lg" tone="matcha" icon={<PlayIcon size={30} />} onClick={() => setGamePaused(false)}>
                  Keep playing
                </Button>
                <div className="row">
                  <Button tone="apricot" icon={<ReplayIcon size={22} />} onClick={onRestart}>
                    Start over
                  </Button>
                  <Button tone="lavender" icon={<GearIcon size={22} />} onClick={onSettings}>
                    Settings
                  </Button>
                  <Button tone="cream" icon={<HomeIcon size={22} />} onClick={onHome}>
                    Home
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
