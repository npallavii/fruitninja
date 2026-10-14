import { useEffect, type ReactNode } from 'react';
import { fruitDataUrl } from '../art/fruits';
import { audio } from '../audio/audio';
import { voice } from '../audio/voice';
import { LEVELS, type RoundResult } from '../state/types';
import { Companion } from './Characters';
import { ClockIcon, FlowerIcon, HomeIcon, LeafIcon, ReplayIcon } from './Icons';
import { Backdrop, Button, SpeechBubble } from './ui';

const SUCCESS_LABEL = { giggle: 'Fruits sliced', waterway: 'Fruit caught', sky: 'Cloudberries caught' } as const;

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat__icon">{icon}</span>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

export function ResultsScreen({
  result,
  newBest,
  unlocked,
  onReplay,
  onLevels,
  onHome,
}: {
  result: RoundResult;
  newBest: boolean;
  unlocked: string | null;
  onReplay: () => void;
  onLevels: () => void;
  onHome: () => void;
}) {
  const friend = LEVELS.find((l) => l.id === result.level)?.companion ?? 'pip';
  const mins = Math.floor(result.activeSeconds / 60);
  const secs = String(result.activeSeconds % 60).padStart(2, '0');
  const pipLine =
    result.flowers > 0
      ? `You helped ${result.flowers} flower${result.flowers === 1 ? '' : 's'} bloom today!`
      : 'What lovely moving! The garden loved it.';
  useEffect(() => {
    audio.stopMusic();
    const extra = newBest ? ' And that’s your best score ever!' : '';
    const id = window.setTimeout(() => voice.say(pipLine + extra, friend, true), 900);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Backdrop rainbow>
      <main className="results">
        <h2 className="screen-title">Your Garden Today</h2>
        <div className="results__grid">
          <figure className="frame">
            <div className="frame__inner">
              {result.painting ? <img src={result.painting} alt="The garden painted during this round" /> : <div className="frame__empty" />}
            </div>
            <span className="frame__corner frame__corner--tl" />
            <span className="frame__corner frame__corner--tr" />
            <span className="frame__corner frame__corner--bl" />
            <span className="frame__corner frame__corner--br" />
            <figcaption>Your movements painted this garden</figcaption>
          </figure>

          <aside className="card stats">
            {newBest && <div className="ribbon">New best!</div>}
            <Stat icon={<img src={fruitDataUrl('strawberry')} alt="" width={34} />} label={SUCCESS_LABEL[result.level]} value={result.fruits} />
            <Stat icon={<FlowerIcon size={30} />} label="Flowers woke up" value={result.flowers} />
            <Stat icon={<ClockIcon size={28} />} label="Time moving" value={`${mins}:${secs}`} />
            <Stat icon={<span className="mini-rainbow" />} label="Best flow" value={result.bestCombo ? `×${result.bestCombo}` : '—'} />
            {result.frostCleared > 0 && <Stat icon={<span className="mini-frost" />} label="Frost statues" value={result.frostCleared} />}
            <div className="stats__points">
              <span>Points</span>
              <strong>{result.score}</strong>
            </div>
            {unlocked && (
              <div className="keepsake">
                <LeafIcon size={22} />
                <span>
                  New garden keepsake: <b>{unlocked}</b>
                </span>
              </div>
            )}
          </aside>
        </div>

        <div className="results__bottom">
          <div className="results__pip">
            <button type="button" className="talk-btn" aria-label="Hear it again" onClick={() => voice.say(pipLine, friend, true)}>
              <Companion who={friend} mood="cheer" size={140} />
            </button>
            <SpeechBubble side="left">{pipLine}</SpeechBubble>
          </div>
          <div className="row">
            <Button size="lg" tone="matcha" icon={<ReplayIcon size={28} />} onClick={onReplay}>
              Play again
            </Button>
            <Button tone="lavender" icon={<FlowerIcon size={24} />} onClick={onLevels}>
              Worlds
            </Button>
            <Button tone="cream" icon={<HomeIcon size={22} />} onClick={onHome}>
              Home
            </Button>
          </div>
        </div>
      </main>
    </Backdrop>
  );
}
