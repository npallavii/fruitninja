import { useEffect, useState, type CSSProperties } from 'react';
import { voice } from '../audio/voice';
import { getProgress, resetProgress } from '../state/progress';
import { settings, type Sensitivity, type Settings } from '../state/settings';
import { CloseIcon, SoundIcon } from './Icons';
import { Button } from './ui';

function Slider({ label, value, onChange, left, right }: { label: string; value: number; onChange: (v: number) => void; left?: string; right?: string }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={{ '--fill': `${Math.round(value * 100)}%` } as CSSProperties}
      />
      {(left || right) && (
        <span className="field__ends">
          <span>{left}</span>
          <span>{right}</span>
        </span>
      )}
    </label>
  );
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; t: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" aria-checked={o.v === value} className={o.v === value ? 'is-on' : ''} onClick={() => onChange(o.v)}>
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={value} onClick={() => onChange(!value)}>
      <span>
        <span className="field__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
      <span className={`toggle__track ${value ? 'is-on' : ''}`}>
        <span className="toggle__knob" />
      </span>
    </button>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Settings>(settings.get());
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  useEffect(() => settings.subscribe(setS), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const set = (p: Partial<Settings>) => settings.update(p);
  const camLabel = s.cameraOpacity < 0.05 ? 'Garden only — camera hidden during play' : s.cameraOpacity < 0.5 ? 'Soft glimpse' : s.cameraOpacity < 0.9 ? 'Soft mirror (recommended)' : 'Clear mirror';
  const rounds = getProgress().totalRounds;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Settings for grown-ups" onClick={onClose}>
      <div className="modal__sheet card" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <div>
            <h2>For grown-ups</h2>
            <p>Make the garden just right for your child.</p>
          </div>
          <Button size="sm" tone="cream" icon={<CloseIcon size={22} />} onClick={onClose} ariaLabel="Close settings" />
        </header>

        <section>
          <h3>Camera picture</h3>
          <Slider label={camLabel} value={s.cameraOpacity} onChange={(v) => set({ cameraOpacity: v })} left="Garden only" right="Clear mirror" />
          <p className="note">This only changes how the picture looks. Body tracking always reads the full camera image, so it works at every setting.</p>
        </section>

        <section>
          <h3>Sound</h3>
          <Slider label="Music" value={s.musicVolume} onChange={(v) => set({ musicVolume: v })} />
          <Slider label="Sound effects" value={s.sfxVolume} onChange={(v) => set({ sfxVolume: v })} />
          <Toggle label="Mute everything" value={s.muted} onChange={(v) => set({ muted: v })} />
        </section>

        <section>
          <h3>Character voices</h3>
          <Toggle label="Pip, Bloop and Misty talk" hint="Each friend reads their words aloud in their own voice" value={s.voices} onChange={(v) => set({ voices: v })} />
          {s.voices && (
            <>
              <Slider label="Voice volume" value={s.voiceVolume} onChange={(v) => set({ voiceVolume: v })} />
              <div className="row row--start">
                <Button size="sm" tone="apricot" onClick={() => voice.say('Hi! I’m Pip!', 'pip', true)}>
                  Hear Pip
                </Button>
                <Button size="sm" tone="slate" onClick={() => voice.say('Ribbit! I’m Bloop!', 'bloop', true)}>
                  Hear Bloop
                </Button>
                <Button size="sm" tone="lavender" onClick={() => voice.say('Hello, I’m Misty.', 'misty', true)}>
                  Hear Misty
                </Button>
              </div>
            </>
          )}
        </section>

        <section>
          <h3>Play</h3>
          <Segmented<Sensitivity>
            label="Slicing"
            value={s.sensitivity}
            options={[
              { v: 'gentle', t: 'Gentle swish' },
              { v: 'normal', t: 'Normal' },
              { v: 'zippy', t: 'Big swoosh' },
            ]}
            onChange={(v) => set({ sensitivity: v })}
          />
          <Segmented<number>
            label="Round length"
            value={s.roundSeconds}
            options={[
              { v: 45, t: '45 sec' },
              { v: 60, t: '1 min' },
              { v: 90, t: '1½ min' },
            ]}
            onChange={(v) => set({ roundSeconds: v })}
          />
          <Toggle label="Calm motion" hint="Fewer petals and floating effects" value={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
        </section>

        <section className="modal__foot">
          <span className="note">
            <SoundIcon size={18} off={s.muted} /> {rounds} round{rounds === 1 ? '' : 's'} played so far
          </span>
          {resetDone ? (
            <span className="note">Garden progress reset.</span>
          ) : confirmReset ? (
            <span className="row">
              <Button size="sm" tone="blush" onClick={() => (resetProgress(), setResetDone(true))}>
                Yes, reset
              </Button>
              <Button size="sm" tone="cream" onClick={() => setConfirmReset(false)}>
                Keep it
              </Button>
            </span>
          ) : (
            <Button size="sm" tone="cream" onClick={() => setConfirmReset(true)}>
              Reset progress
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
