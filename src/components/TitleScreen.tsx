import { fruitDataUrl, type FruitKind } from '../art/fruits';
import { Pip } from './Characters';
import { GearIcon, PlayIcon } from './Icons';
import { Backdrop, Button, SpeechBubble } from './ui';

const LOGO = 'Fruitopia'.split('');
const LOGO_COLORS = ['#E58F9C', '#EE9D5B', '#D9B465', '#8DB27C', '#7FA2C4', '#A88BC4', '#E58F9C', '#EE9D5B', '#8DB27C'];

const FLOATERS: { kind: FruitKind; x: string; y: string; s: number; d: number }[] = [
  { kind: 'strawberry', x: '9%', y: '18%', s: 92, d: 0 },
  { kind: 'watermelon', x: '80%', y: '14%', s: 118, d: 1.2 },
  { kind: 'peach', x: '17%', y: '58%', s: 96, d: 2.1 },
  { kind: 'banana', x: '72%', y: '52%', s: 100, d: 0.6 },
  { kind: 'grapes', x: '88%', y: '40%', s: 84, d: 1.8 },
  { kind: 'orange', x: '4%', y: '40%', s: 78, d: 2.6 },
];

export function TitleScreen({ onPlay, onSettings }: { onPlay: () => void; onSettings: () => void }) {
  return (
    <Backdrop rainbow>
      <main className="title">
        {FLOATERS.map((f) => (
          <img
            key={f.kind}
            className="floater"
            src={fruitDataUrl(f.kind)}
            alt=""
            style={{ left: f.x, top: f.y, width: f.s, animationDelay: `${f.d}s` }}
          />
        ))}

        <header className="title__logo">
          <h1 className="logo" aria-label="Fruitopia">
            {LOGO.map((ch, i) => (
              <span key={i} style={{ color: LOGO_COLORS[i], animationDelay: `${i * 0.12}s` }}>
                {ch}
              </span>
            ))}
          </h1>
          <p className="logo__sub">The Magical Moving Garden</p>
          <p className="tagline">
            Move <i>•</i> Play <i>•</i> Grow
          </p>
          <p className="tagline tagline--small">Every movement brings the world to life.</p>
        </header>

        <div className="title__actions">
          <Button size="lg" tone="matcha" icon={<PlayIcon size={34} />} onClick={onPlay}>
            Play
          </Button>
          <Button size="sm" tone="cream" icon={<GearIcon size={22} />} onClick={onSettings}>
            Grown-ups
          </Button>
        </div>

        <div className="title__pip">
          <SpeechBubble side="right">Hi! I’m Pip. Let’s wake up the garden together!</SpeechBubble>
          <Pip mood="happy" size={210} />
        </div>

        <p className="title__chip">Active play · Low stimulation · For kids</p>
      </main>
    </Backdrop>
  );
}
