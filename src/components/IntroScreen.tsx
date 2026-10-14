import { useEffect } from 'react';
import { fruitDataUrl } from '../art/fruits';
import { voice } from '../audio/voice';
import type { InputMode } from '../state/types';
import { Pip } from './Characters';
import { BackIcon, CameraIcon, FlowerIcon, HandIcon } from './Icons';
import { Backdrop, Button, SpeechBubble } from './ui';

/** How to play + choose camera or mouse/touch. Short, visual, no long reading. */
const LINE = 'The garden is sleepy. Let’s move our bodies to wake it up! Swish your arms, slice the fruit, and watch the flowers bloom!';

export function IntroScreen({ onChoose, onBack }: { onChoose: (m: InputMode) => void; onBack: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(() => voice.say(LINE, 'pip', true), 400);
    return () => {
      window.clearTimeout(id);
      voice.stop();
    };
  }, []);
  return (
    <Backdrop rainbow={false}>
      <main className="intro">
        <Button className="corner-back" size="sm" tone="cream" icon={<BackIcon size={22} />} onClick={onBack} ariaLabel="Back" />
        <div className="intro__pip">
          <button type="button" className="talk-btn" aria-label="Hear Pip again" onClick={() => voice.say(LINE, 'pip', true)}>
            <Pip mood="cheer" size={230} />
          </button>
          <SpeechBubble side="left">
            The garden is sleepy. <br />
            Let’s move our bodies to wake it up!
          </SpeechBubble>
        </div>

        <ol className="steps">
          <li className="step">
            <div className="step__art step__art--swish">
              <HandIcon size={52} />
              <svg className="swish" viewBox="0 0 120 50" aria-hidden>
                <path d="M6 40 Q60 -6 114 30" />
              </svg>
            </div>
            <span className="step__num">1</span>
            <p>Swish your arms</p>
          </li>
          <li className="step">
            <div className="step__art">
              <img src={fruitDataUrl('peach')} alt="" className="step__fruit step__fruit--a" />
              <img src={fruitDataUrl('strawberry')} alt="" className="step__fruit step__fruit--b" />
            </div>
            <span className="step__num">2</span>
            <p>Slice the fruit</p>
          </li>
          <li className="step">
            <div className="step__art step__art--bloom">
              <FlowerIcon size={74} />
            </div>
            <span className="step__num">3</span>
            <p>Watch flowers bloom</p>
          </li>
        </ol>

        <div className="intro__choose">
          <Button size="lg" tone="matcha" icon={<CameraIcon size={32} />} onClick={() => onChoose('camera')}>
            Play with my body
          </Button>
          <Button size="md" tone="lavender" icon={<HandIcon size={26} />} onClick={() => onChoose('mouse')}>
            Mouse or touch
          </Button>
        </div>
        <p className="intro__note">
          Grown-ups: clear a safe space around your child, and place the screen so they can stand a few steps back.
        </p>
      </main>
    </Backdrop>
  );
}
