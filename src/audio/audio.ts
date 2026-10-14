// Gentle, procedurally generated audio: kalimba + marimba + soft pad music at ~112 BPM,
// and organic sound effects (paper swish, water drops, bamboo chimes, wooden taps).
// Nothing plays until the player has interacted with the page.
import { settings } from '../state/settings';

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// C major pentatonic — every combination sounds pleasant
const PENTA = [0, 2, 4, 7, 9];
const scaleNote = (degree: number, base = 72) =>
  base + PENTA[((degree % 5) + 5) % 5] + 12 * Math.floor(degree / 5);

const CHORDS = [
  [48, 55, 59, 64], // Cmaj7
  [45, 52, 55, 60], // Am7
  [41, 48, 52, 57], // Fmaj7
  [43, 50, 55, 59], // G
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private bpm = 112;
  private melody: (number | null)[] = [];
  private ducked = false;

  /** Call from a user gesture (click/tap). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.build();
      settings.subscribe(() => this.applyVolumes());
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private build(): void {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    // soft limiter so nothing is ever harsh
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.master.connect(comp).connect(ctx.destination);

    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.2);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb).connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const s = settings.get();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 0.9, t, 0.05);
    this.music.gain.setTargetAtTime(s.musicVolume * 0.55 * (this.ducked ? 0.35 : 1), t, 0.2);
    this.sfx.gain.setTargetAtTime(s.sfxVolume * 0.8, t, 0.05);
  }

  duck(on: boolean): void {
    this.ducked = on;
    this.applyVolumes();
  }

  // ------------------------------------------------------------ instruments

  private tone(
    out: AudioNode,
    freq: number,
    when: number,
    { type = 'sine', attack = 0.005, decay = 1.2, gain = 0.2, partials = [] as [number, number, number][], reverb = 0.3 } = {},
  ): void {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(gain, when + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    env.connect(out);
    if (reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      env.connect(send).connect(this.reverbSend);
    }
    const make = (f: number, g: number, dec: number) => {
      const o = ctx.createOscillator();
      o.type = type as OscillatorType;
      o.frequency.value = f;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(g, when);
      pg.gain.exponentialRampToValueAtTime(0.0001, when + attack + dec);
      o.connect(pg).connect(env);
      o.start(when);
      o.stop(when + attack + dec + 0.05);
    };
    make(freq, 1, decay);
    for (const [ratio, g, dec] of partials) make(freq * ratio, g, dec);
  }

  private kalimba(midi: number, when: number, gain = 0.16, out?: AudioNode): void {
    this.tone(out ?? this.music, midiToHz(midi), when, {
      decay: 1.4,
      gain,
      partials: [
        [5.4, 0.18, 0.12],
        [2.0, 0.08, 0.5],
      ],
      reverb: 0.45,
    });
  }

  private marimba(midi: number, when: number, gain = 0.14, out?: AudioNode): void {
    this.tone(out ?? this.music, midiToHz(midi), when, {
      decay: 0.55,
      gain,
      partials: [
        [4.0, 0.25, 0.08],
        [10.0, 0.05, 0.03],
      ],
      reverb: 0.2,
    });
  }

  private pad(midis: number[], when: number, dur: number): void {
    const ctx = this.ctx!;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 900;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.045, when + 0.8);
    env.gain.setValueAtTime(0.045, when + dur - 0.6);
    env.gain.linearRampToValueAtTime(0, when + dur + 0.4);
    filt.connect(env).connect(this.music);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    env.connect(send).connect(this.reverbSend);
    for (const m of midis) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midiToHz(m + 12);
        o.detune.value = det;
        o.connect(filt);
        o.start(when);
        o.stop(when + dur + 0.5);
      }
    }
  }

  private noiseBurst(
    when: number,
    { dur = 0.12, freq = 3000, q = 1.2, gain = 0.12, sweepTo = 0, type = 'bandpass' as BiquadFilterType, out = this.sfx as AudioNode } = {},
  ): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, when);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, when + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(out);
    src.start(when, Math.random() * 0.5);
    src.stop(when + dur + 0.05);
  }

  // ------------------------------------------------------------ music

  startMusic(): void {
    if (!this.ctx || this.schedulerId !== null) return;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.15;
    this.melody = this.composeMelody();
    this.schedulerId = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    if (this.schedulerId !== null) window.clearInterval(this.schedulerId);
    this.schedulerId = null;
  }

  /** A gentle 4-bar kalimba motif (8th notes) repeated with variations. */
  private composeMelody(): (number | null)[] {
    const motif = [0, null, 2, 4, null, 3, 2, null, 1, null, 2, null, 4, 5, null, null];
    const answer = [5, null, 4, 2, null, 3, 4, null, 2, null, 1, null, 0, null, null, null];
    return [...motif, ...answer, ...motif.map((d) => (d === null ? null : d + 1)), ...answer];
  }

  private schedule(): void {
    const ctx = this.ctx!;
    const eighth = 60 / this.bpm / 2;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      const t = this.nextNoteTime;
      const bar = Math.floor(this.step / 8);
      const inBar = this.step % 8;
      const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
      if (inBar === 0 && bar % 2 === 0) this.pad(chord.slice(1), t, eighth * 16);
      if (inBar === 0 || inBar === 4) this.marimba(chord[0] + (inBar === 4 ? 7 : 0), t, 0.13);
      if (inBar === 3 || inBar === 7) this.marimba(chord[2] + 12, t, 0.05);
      const deg = this.melody[this.step % this.melody.length];
      if (deg !== null && deg !== undefined) this.kalimba(scaleNote(deg), t + (Math.random() - 0.5) * 0.01, 0.11);
      // soft shaker on the off-beats
      if (inBar % 2 === 1) this.noiseBurst(t, { dur: 0.06, freq: 7000, type: 'highpass', q: 0.7, gain: 0.025, out: this.music });
      this.step++;
      this.nextNoteTime += eighth;
    }
  }

  // ------------------------------------------------------------ sound effects

  private now(): number {
    return this.ctx ? this.ctx.currentTime + 0.005 : 0;
  }

  /** Paper swish + a pentatonic pluck that climbs with each fruit in a combo. */
  slice(comboIndex = 0, kind?: string): void {
    if (!this.ctx) return;
    const t = this.now();
    this.noiseBurst(t, { dur: 0.16, freq: 1800, sweepTo: 5200, q: 0.9, gain: 0.09 });
    this.kalimba(scaleNote(Math.min(comboIndex, 9), 72), t + 0.02, 0.15, this.sfx);
    if (kind === 'watermelon' || kind === 'orange') this.drop(t + 0.04, 0.6);
  }

  private drop(t: number, gain = 1): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(1300, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.sfx);
    const send = ctx.createGain();
    send.gain.value = 0.4;
    g.connect(send).connect(this.reverbSend);
    o.start(t);
    o.stop(t + 0.2);
  }

  water(): void {
    if (!this.ctx) return;
    const t = this.now();
    this.drop(t);
    this.noiseBurst(t, { dur: 0.3, freq: 900, sweepTo: 400, q: 0.6, gain: 0.04, type: 'lowpass' });
  }

  /** Bamboo wind chimes — used for combos and the frost crystal. */
  chimes(count = 5, base = 84): void {
    if (!this.ctx) return;
    const t = this.now();
    for (let i = 0; i < count; i++) {
      this.tone(this.sfx, midiToHz(scaleNote(i * 2 + Math.floor(Math.random() * 2), base)), t + i * 0.09 + Math.random() * 0.03, {
        decay: 2.2,
        gain: 0.06,
        partials: [[2.76, 0.3, 0.6]],
        reverb: 0.7,
      });
    }
  }

  combo(n: number): void {
    if (!this.ctx) return;
    const t = this.now();
    for (let i = 0; i < Math.min(n + 1, 6); i++) this.kalimba(scaleNote(i * 2, 72), t + i * 0.07, 0.12, this.sfx);
    this.chimes(3, 91);
  }

  bloom(): void {
    if (!this.ctx) return;
    const t = this.now();
    [0, 2, 4].forEach((d, i) => this.marimba(scaleNote(d, 79), t + i * 0.08, 0.1, this.sfx));
  }

  tap(): void {
    if (!this.ctx) return;
    this.marimba(67, this.now(), 0.12, this.sfx);
  }

  frostStart(): void {
    this.chimes(7, 86);
  }

  frostClear(): void {
    if (!this.ctx) return;
    const t = this.now();
    [0, 1, 2, 3, 4, 5, 7].forEach((d, i) => this.kalimba(scaleNote(d, 79), t + i * 0.06, 0.1, this.sfx));
  }

  celebrate(): void {
    if (!this.ctx) return;
    const t = this.now();
    [0, 2, 4, 5, 7, 9, 10].forEach((d, i) => this.kalimba(scaleNote(d, 72), t + i * 0.11, 0.13, this.sfx));
    this.chimes(5, 91);
  }

  ui(): void {
    if (!this.ctx) return;
    this.marimba(79, this.now(), 0.08, this.sfx);
  }
}

export const audio = new AudioEngine();
