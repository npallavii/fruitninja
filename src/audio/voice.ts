// Character voices. Uses the browser's built-in speech engine (free, no audio files),
// tuned per character, with a small signature sound before each line.
import { settings } from '../state/settings';
import { audio } from './audio';

export type Speaker = 'pip' | 'bloop' | 'misty';

interface Profile {
  pitch: number;
  rate: number;
}

/** How each character sounds. */
const PROFILES: Record<Speaker, Profile> = {
  pip: { pitch: 1.55, rate: 1.04 }, // bright, bouncy little red panda
  bloop: { pitch: 0.7, rate: 0.9 }, // slow, warm, low frog
  misty: { pitch: 1.3, rate: 0.84 }, // soft, airy, dreamy cloud
};

/** Friendly, natural-sounding voices in order of preference (Edge, Chrome, macOS/iOS, Android). */
const PREFERRED = [
  /Microsoft (Ana|Jenny|Aria|Emma|Ava|Libby|Maisie|Sonia) Online \(Natural\)/i,
  /Microsoft .* Online \(Natural\).*English/i,
  /Google UK English Female/i,
  /Google US English/i,
  /(Samantha|Karen|Moira|Tessa|Fiona|Serena)/i,
  /Microsoft (Zira|Hazel|Susan)/i,
  /female/i,
];

class VoiceEngine {
  private voice: SpeechSynthesisVoice | null = null;
  private speaking = false;
  private lastText = '';
  private lastAt = 0;
  private readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  constructor() {
    if (!this.supported) return;
    const pick = () => (this.voice = this.chooseVoice());
    pick();
    window.speechSynthesis.addEventListener?.('voiceschanged', pick);
  }

  private chooseVoice(): SpeechSynthesisVoice | null {
    const all = window.speechSynthesis.getVoices();
    const english = all.filter((v) => /^en(-|_|$)/i.test(v.lang));
    for (const re of PREFERRED) {
      const v = english.find((x) => re.test(x.name));
      if (v) return v;
    }
    return english.find((v) => v.localService) ?? english[0] ?? all[0] ?? null;
  }

  /**
   * Say a line as a character. `important` lines interrupt; others are skipped
   * if someone is already talking, so voices never pile up.
   */
  say(text: string, speaker: Speaker, important = false): void {
    const s = settings.get();
    if (!s.voices || s.muted) {
      audio.chirp(speaker);
      return;
    }
    const now = performance.now();
    if (!important && text === this.lastText && now - this.lastAt < 4000) return;
    if (this.speaking && !important) return;
    this.lastText = text;
    this.lastAt = now;

    audio.chirp(speaker);
    if (!this.supported) return;
    const synth = window.speechSynthesis;
    if (important) synth.cancel();
    if (!this.voice) this.voice = this.chooseVoice();

    const u = new SpeechSynthesisUtterance(clean(text));
    const p = PROFILES[speaker];
    if (this.voice) u.voice = this.voice;
    u.lang = this.voice?.lang ?? 'en-US';
    u.pitch = p.pitch;
    u.rate = p.rate;
    u.volume = Math.max(0, Math.min(1, s.voiceVolume));
    this.speaking = true;
    audio.duck(true, 'voice');
    const id = ++this.lineId;
    const done = () => {
      if (id !== this.lineId) return; // a newer line took over
      this.speaking = false;
      audio.duck(false, 'voice');
    };
    u.onend = done;
    u.onerror = done;
    // safety net: some browsers occasionally never fire "end"
    window.setTimeout(done, 1500 + text.length * 110);
    // let the little signature sound play first
    window.setTimeout(() => synth.speak(u), 180);
  }

  private lineId = 0;

  stop(): void {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    this.speaking = false;
    audio.duck(false, 'voice');
  }
}

/** Speech engines read symbols oddly — keep only words and gentle punctuation. */
function clean(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/×/g, ' times ')
    .replace(/—/g, ', ')
    .replace(/…/g, '.')
    .trim();
}

export const voice = new VoiceEngine();
