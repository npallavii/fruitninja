import { useEffect, useState, type ReactNode } from 'react';
import { paintGiggleGarden, paintedUrl } from '../art/backgrounds';
import { audio } from '../audio/audio';
import { settings } from '../state/settings';

type Tone = 'apricot' | 'matcha' | 'blush' | 'lavender' | 'cream' | 'slate';

export function Button({
  children,
  onClick,
  tone = 'apricot',
  size = 'md',
  icon,
  disabled,
  ariaLabel,
  className = '',
}: {
  children?: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`btn btn--${tone} btn--${size} ${children ? '' : 'btn--icon'} ${className}`}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => {
        audio.unlock();
        audio.ui();
        onClick?.();
      }}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children && <span className="btn__label">{children}</span>}
    </button>
  );
}

/** Full-screen painted garden behind menus. Painted once, after first render. */
export function Backdrop({ rainbow = true, children }: { rainbow?: boolean; children?: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setUrl(paintedUrl(`garden-${rainbow}`, () => paintGiggleGarden(1600, 900, { rainbow, seed: rainbow ? 42 : 2024 })));
    }, 30);
    return () => window.clearTimeout(id);
  }, [rainbow]);
  return (
    <div className="backdrop">
      <div className={`backdrop__paint ${url ? 'is-ready' : ''}`} style={url ? { backgroundImage: `url(${url})` } : undefined} />
      <Petals />
      <div className="backdrop__content">{children}</div>
    </div>
  );
}

/** A few slow drifting petals (disabled with reduced motion). */
export function Petals({ count = 10 }: { count?: number }) {
  const [reduced, setReduced] = useState(settings.get().reducedMotion);
  useEffect(() => settings.subscribe((s) => setReduced(s.reducedMotion)), []);
  if (reduced) return null;
  return (
    <div className="petals" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`petal petal--${i % 4}`}
          style={{ left: `${(i * 97) % 100}%`, animationDelay: `${(i * 1.7) % 12}s`, animationDuration: `${13 + (i % 5) * 2}s` }}
        />
      ))}
    </div>
  );
}

export function SpeechBubble({ children, side = 'left' }: { children: ReactNode; side?: 'left' | 'right' | 'bottom' }) {
  return <div className={`bubble bubble--${side}`}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
