// Rounded, friendly line icons (inline SVG — always available, crisp at any size).
type P = { size?: number };
const base = (size = 26) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const PlayIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </svg>
);
export const PauseIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M9 6v12M15 6v12" strokeWidth={3} />
  </svg>
);
export const HomeIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5" />
  </svg>
);
export const GearIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </svg>
);
export const ReplayIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" />
  </svg>
);
export const CameraIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="7" width="13" height="10" rx="3" />
    <path d="M16 10.5l5-2.5v8l-5-2.5" />
  </svg>
);
export const HandIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v5.5M14 10.5V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5A5.5 5.5 0 0 1 6 17.5l-2-3.8a1.5 1.5 0 0 1 2.6-1.5L8 14" />
  </svg>
);
export const LeafIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" />
    <path d="M5 19l8-8" />
  </svg>
);
export const BackIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </svg>
);
export const ClockIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const FlowerIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}>
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx="12" cy="7" rx="3" ry="4" transform={`rotate(${a} 12 12)`} fill="#F2B7BC" stroke="#E58F9C" />
    ))}
    <circle cx="12" cy="12" r="2.6" fill="#F4D99A" stroke="#D9B465" />
  </svg>
);
export const LockLeafIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <rect x="5" y="11" width="14" height="9" rx="3" />
    <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
  </svg>
);
export const SoundIcon = ({ size, off }: P & { off?: boolean }) => (
  <svg {...base(size)}>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
    {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
  </svg>
);
export const CloseIcon = ({ size }: P) => (
  <svg {...base(size)}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);
