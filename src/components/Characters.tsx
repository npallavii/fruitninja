import { useId } from 'react';

export type Mood = 'happy' | 'cheer' | 'calm';


/** Pip — the red panda Garden Guardian, with a green leaf scarf. */
export function Pip({ mood = 'happy', size = 200, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const tail = `tail${uid}`;
  const body = `body${uid}`;
  const head = `head${uid}`;
  return (
    <svg
      className={`pip pip--${mood} ${className}`}
      width={size}
      height={size * (240 / 220)}
      viewBox="0 0 220 240"
      role="img"
      aria-label="Pip the red panda"
    >
      <defs>
        <radialGradient id={body} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#EC9A66" />
          <stop offset="100%" stopColor="#C9673E" />
        </radialGradient>
        <radialGradient id={head} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#F0A472" />
          <stop offset="100%" stopColor="#D2734A" />
        </radialGradient>
        <clipPath id={tail}>
          <path d="M132 200 C190 208 218 160 204 112 C196 86 166 86 168 112 C170 140 158 168 128 176 Z" />
        </clipPath>
      </defs>

      <ellipse cx="112" cy="232" rx="64" ry="7" fill="#9C7A5B" opacity="0.18" />

      <g>
        {/* tail */}
        <g className="pip__tail">
          <path d="M132 200 C190 208 218 160 204 112 C196 86 166 86 168 112 C170 140 158 168 128 176 Z" fill={`url(#${body})`} />
          <g clipPath={`url(#${tail})`} stroke="#9E4F36" strokeWidth="12" opacity="0.55" fill="none">
            <path d="M150 196 C176 186 196 168 206 150" />
            <path d="M162 130 C176 136 192 132 206 122" />
          </g>
          <path d="M190 96 C200 98 206 106 205 114 C196 110 186 106 180 100 Z" fill="#F7E6D2" />
        </g>

        {/* feet */}
        <ellipse cx="84" cy="222" rx="20" ry="13" fill="#6E4A44" />
        <ellipse cx="138" cy="222" rx="20" ry="13" fill="#6E4A44" />
        <circle cx="84" cy="224" r="5" fill="#E9A2A6" opacity="0.8" />
        <circle cx="138" cy="224" r="5" fill="#E9A2A6" opacity="0.8" />

        {/* body */}
        <ellipse cx="110" cy="178" rx="54" ry="50" fill={`url(#${body})`} />
        <ellipse cx="110" cy="190" rx="31" ry="33" fill="#F7E6D2" />

        {/* arms */}
        <ellipse cx="66" cy="180" rx="13" ry="25" fill="#6E4A44" transform="rotate(18 66 180)" />
        <g className="pip__arm">
          <ellipse cx="158" cy="168" rx="13" ry="25" fill="#6E4A44" transform="rotate(-22 158 168)" />
        </g>

        {/* leaf scarf */}
        <path d="M60 138 Q110 164 160 138 L162 154 Q110 182 58 154 Z" fill="#8FB07E" />
        <path d="M134 156 Q156 168 152 196 Q134 186 130 162 Z" fill="#A8C58A" />
        <path d="M136 162 Q146 176 148 190" stroke="#6E9665" strokeWidth="2" fill="none" />
        <circle cx="84" cy="152" r="3" fill="#C9DDB3" />
        <circle cx="104" cy="158" r="3" fill="#C9DDB3" />
        <circle cx="124" cy="156" r="3" fill="#C9DDB3" />

        {/* ears */}
        <path d="M44 72 C32 40 46 18 72 28 C82 33 84 46 80 56 Z" fill="#7A4B42" />
        <path d="M50 64 C44 44 52 34 68 38 C74 42 74 50 72 56 Z" fill="#F7E6D2" />
        <path d="M176 72 C188 40 174 18 148 28 C138 33 136 46 140 56 Z" fill="#7A4B42" />
        <path d="M170 64 C176 44 168 34 152 38 C146 42 146 50 148 56 Z" fill="#F7E6D2" />

        {/* head */}
        <ellipse cx="110" cy="92" rx="72" ry="58" fill={`url(#${head})`} />
        <ellipse cx="110" cy="114" rx="36" ry="25" fill="#FBF3EA" />
        <ellipse cx="62" cy="104" rx="21" ry="17" fill="#FBF3EA" />
        <ellipse cx="158" cy="104" rx="21" ry="17" fill="#FBF3EA" />
        <ellipse cx="85" cy="62" rx="10" ry="6" fill="#FBF3EA" />
        <ellipse cx="135" cy="62" rx="10" ry="6" fill="#FBF3EA" />

        {/* leaf sprout */}
        <path d="M110 38 C104 22 110 10 120 8 C124 20 120 32 110 38 Z" fill="#A8C58A" />
        <path d="M110 38 C108 28 112 18 118 12" stroke="#6E9665" strokeWidth="1.6" fill="none" />
      </g>

      {/* face (kept crisp, outside the wobble filter) */}
      <g className="pip__eyes">
        <ellipse cx="86" cy="88" rx="11" ry="13" fill="#3F2E33" />
        <ellipse cx="134" cy="88" rx="11" ry="13" fill="#3F2E33" />
        <circle cx="82" cy="83" r="4.2" fill="#fff" />
        <circle cx="130" cy="83" r="4.2" fill="#fff" />
        <circle cx="90" cy="93" r="2" fill="#fff" />
        <circle cx="138" cy="93" r="2" fill="#fff" />
      </g>
      <ellipse cx="68" cy="112" rx="10" ry="5.5" fill="#F2A1A8" opacity="0.65" />
      <ellipse cx="152" cy="112" rx="10" ry="5.5" fill="#F2A1A8" opacity="0.65" />
      <path d="M103 104 Q110 99 117 104 Q114 111 110 111 Q106 111 103 104 Z" fill="#4A3438" />
      {mood === 'cheer' ? (
        <path d="M100 116 Q110 132 120 116 Z" fill="#8C4B55" stroke="#4A3438" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path d="M101 115 Q105.5 121 110 115 Q114.5 121 119 115" stroke="#4A3438" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Bloop — the river frog (Wiggly Waterway companion). */
export function Bloop({ size = 140, mood = 'happy' }: { size?: number; mood?: Mood }) {
  return (
    <svg className={`buddy buddy--${mood}`} width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Bloop the frog">
      <ellipse cx="80" cy="146" rx="62" ry="10" fill="#A8C58A" opacity="0.6" />
      <g>
        <ellipse cx="80" cy="112" rx="50" ry="36" fill="#A8C58A" />
        <ellipse cx="80" cy="120" rx="30" ry="22" fill="#D7E6C0" />
        <ellipse cx="80" cy="74" rx="52" ry="38" fill="#B5CF96" />
        <circle cx="54" cy="46" r="18" fill="#B5CF96" />
        <circle cx="106" cy="46" r="18" fill="#B5CF96" />
        <ellipse cx="44" cy="138" rx="18" ry="8" fill="#94B57A" />
        <ellipse cx="116" cy="138" rx="18" ry="8" fill="#94B57A" />
        {[-1, 0, 1].map((i) => (
          <ellipse key={i} cx={80 + i * 10} cy={30} rx="6" ry="14" fill="#F2B7BC" transform={`rotate(${i * 30} ${80 + i * 10} 40)`} />
        ))}
      </g>
      <circle cx="54" cy="46" r="7" fill="#3F2E33" />
      <circle cx="106" cy="46" r="7" fill="#3F2E33" />
      <circle cx="52" cy="43" r="2.4" fill="#fff" />
      <circle cx="104" cy="43" r="2.4" fill="#fff" />
      <ellipse cx="44" cy="80" rx="10" ry="6" fill="#E89A9F" opacity="0.55" />
      <ellipse cx="116" cy="80" rx="10" ry="6" fill="#E89A9F" opacity="0.55" />
      <path d="M66 82 Q80 94 94 82" stroke="#4A3438" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Misty — the cloud friend (Cloudberry Sky companion). */
export function Misty({ size = 140, mood = 'happy' }: { size?: number; mood?: Mood }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg className={`buddy buddy--${mood}`} width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Misty the cloud">
      <defs>
        <radialGradient id={`m${uid}`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#FFFBF4" />
          <stop offset="100%" stopColor="#D5C7E4" />
        </radialGradient>
      </defs>
      <g>
        <g fill={`url(#m${uid})`} stroke="#B9A6D3" strokeWidth="3">
          <circle cx="80" cy="64" r="38" />
          <circle cx="44" cy="88" r="28" />
          <circle cx="116" cy="88" r="28" />
          <ellipse cx="80" cy="102" rx="54" ry="30" />
        </g>
        <ellipse cx="62" cy="134" rx="9" ry="7" fill="#D5C7E4" />
        <ellipse cx="98" cy="134" rx="9" ry="7" fill="#D5C7E4" />
        {[-1, 0, 1].map((i) => (
          <ellipse key={i} cx={112 + i * 6} cy={30} rx="5" ry="11" fill="#F2B7BC" transform={`rotate(${i * 35} ${112 + i * 6} 38)`} />
        ))}
        <ellipse cx="112" cy="40" rx="12" ry="4" fill="#A8C58A" />
      </g>
      <path d="M60 86 Q66 80 72 86" stroke="#5B4B4F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M88 86 Q94 80 100 86" stroke="#5B4B4F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M74 98 Q80 104 86 98" stroke="#5B4B4F" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="54" cy="96" rx="8" ry="4.5" fill="#F2A1A8" opacity="0.55" />
      <ellipse cx="106" cy="96" rx="8" ry="4.5" fill="#F2A1A8" opacity="0.55" />
    </svg>
  );
}

/** The friend for a world: Pip (garden), Bloop (river) or Misty (sky). */
export function Companion({ who, mood = 'happy', size = 150 }: { who: 'pip' | 'bloop' | 'misty'; mood?: Mood; size?: number }) {
  if (who === 'bloop') return <Bloop size={size} mood={mood} />;
  if (who === 'misty') return <Misty size={size} mood={mood} />;
  return <Pip size={size} mood={mood} />;
}
