import { useEffect, useState } from 'react';
import { voice } from '../audio/voice';
import { levelThumbUrl } from '../art/backgrounds';
import { fruitDataUrl } from '../art/fruits';
import { getProgress } from '../state/progress';
import { LEVELS, type LevelId } from '../state/types';
import { Bloop, Misty } from './Characters';
import { BackIcon, LockLeafIcon, PlayIcon } from './Icons';
import { Backdrop, Button } from './ui';

const TONES: Record<LevelId, string> = { giggle: 'matcha', waterway: 'slate', sky: 'lavender' };
const FRIEND_NAMES = { pip: 'Peachy', bloop: 'Bloop', misty: 'Misty' } as const;
const HELLOS = {
  pip: 'Hee hee! I’m Peachy. Come slice fruit in the Giggle Garden!',
  bloop: 'Ribbit! I’m Bloop. Hop in my basket boat!',
  misty: 'Hello, I’m Misty. Let’s catch berries from my clouds!',
} as const;

export function LevelSelect({ onPick, onBack }: { onPick: (id: LevelId) => void; onBack: () => void }) {
  const [thumbs, setThumbs] = useState<Partial<Record<LevelId, string>>>({});
  const best = getProgress().bestScore;

  useEffect(() => {
    const id = window.setTimeout(() => voice.say('Which world shall we visit today?', 'pip', true), 300);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    // paint thumbnails one by one so the screen appears instantly
    let i = 0;
    const id = window.setInterval(() => {
      const lv = LEVELS[i++];
      if (!lv) return window.clearInterval(id);
      const url = levelThumbUrl(lv.id);
      setThumbs((t) => ({ ...t, [lv.id]: url }));
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Backdrop rainbow={false}>
      <main className="levels">
        <Button className="corner-back" size="sm" tone="cream" icon={<BackIcon size={22} />} onClick={onBack} ariaLabel="Back" />
        <h2 className="screen-title">Choose a world</h2>
        <div className="levels__grid">
          {LEVELS.map((lv, idx) => (
            <article key={lv.id} className={`level level--${TONES[lv.id]} ${lv.available ? '' : 'is-locked'}`}>
              <div className="level__thumb" style={thumbs[lv.id] ? { backgroundImage: `url(${thumbs[lv.id]})` } : undefined}>
                <span className="level__badge">Level {idx + 1}</span>
                <button type="button" className="level__friend talk-btn" aria-label={`Say hello to ${FRIEND_NAMES[lv.companion]}`} onClick={() => voice.say(HELLOS[lv.companion], lv.companion, true)}>
                  {lv.id === 'giggle' && <img src={fruitDataUrl('peach')} alt="Peachy" width={96} />}
                  {lv.id === 'waterway' && <Bloop size={96} />}
                  {lv.id === 'sky' && <Misty size={96} />}
                </button>
              </div>
              <div className="level__body">
                <h3>{lv.name}</h3>
                <span className="chip">{lv.movement}</span>
                <p>{lv.blurb}</p>
                {lv.available ? (
                  <div className="level__foot">
                    <Button tone="matcha" icon={<PlayIcon size={24} />} onClick={() => onPick(lv.id)}>
                      Play
                    </Button>
                    {best[lv.id] > 0 && <span className="level__best">Best {best[lv.id]}</span>}
                  </div>
                ) : (
                  <div className="level__foot">
                    <span className="level__soon">
                      <LockLeafIcon size={20} /> Growing soon
                    </span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
    </Backdrop>
  );
}
