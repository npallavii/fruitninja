// The Fruitopia palette — muted, warm pastels. No neon, no pure black or white.
export const PALETTE = {
  matcha: '#A8C58A',
  oatmeal: '#F4EBDD',
  apricot: '#F6B889',
  blush: '#F2B7BC',
  plum: '#B98CAF',
  sage: '#A5B9A5',
  lavender: '#D5C7E4',
  slate: '#8196B5',
  honey: '#F4D99A',
  // supporting tones
  cream: '#FBF6EE',
  paper: '#F7F0E4',
  ink: '#5B4B4F', // soft plum-brown for text and outlines (never pure black)
  inkSoft: '#8A7A7C',
  bark: '#9C7A5B',
  wood: '#C9A27A',
  leaf: '#8DB27C',
  leafDeep: '#6E9665',
  sky: '#DCE6EE',
  water: '#A9C3D6',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Pastel tints used for watercolor splashes, trails and petals. */
export const SPLASH_COLORS = [
  PALETTE.blush,
  PALETTE.apricot,
  PALETTE.honey,
  PALETTE.matcha,
  PALETTE.lavender,
  PALETTE.plum,
  PALETTE.slate,
] as const;

export const RAINBOW = ['#F2B7BC', '#F6B889', '#F4D99A', '#A8C58A', '#A9C3D6', '#D5C7E4'] as const;

export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = hexToNumber(hex);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Mix two hex colours, t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
