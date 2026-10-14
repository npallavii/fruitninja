import { useEffect, useState } from 'react';
import { levelThumbUrl } from '../art/backgrounds';
import { fruitDataUrl } from '../art/fruits';
import { getProgress } from '../state/progress';
import { LEVELS, type LevelId } from '../state/types';
import { Bloop, Misty } from './Characters';
import { BackIcon, LockLeafIcon, PlayIcon } from './Icons';
import { Backdrop, Button } from './ui';

const TONES: Record<LevelId, string> = { giggle: 'matcha', waterway: 'slate', sky: 'lavender' };

export function LevelSelect({ onPick, onBack }: { onPick: (id: LevelId) => void; onBack: () => void }) {
  const [thumbs, setThumbs] = useState<Partial<Record<LevelId, string>>>({});
  const best = getProgress().bestScore;

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
                <div className="level__friend">
                  {lv.id === 'giggle' && <img src={fruitDataUrl('peach')} alt="Peachy" width={96} />}
                  {lv.id === 'waterway' && <Bloop size={96} />}
                  {lv.id === 'sky' && <Misty size={96} />}
                </div>
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
