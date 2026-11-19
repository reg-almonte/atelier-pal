export interface ModelFigureProps {
  topHex: string;
  bottomHex: string;
  outerwearHex: string;
  hasOuterwear: boolean;
  footwearHex: string;
  beltHex: string;
  hasBelt: boolean;
  skinToneHex: string;
  lightSkin: boolean;
}

export const GARMENT_TRANSITION = { transition: 'fill 220ms ease' } as const;
export const BODY_TRANSITION = {
  transition: 'fill 220ms ease, stroke 220ms ease, stroke-opacity 220ms ease',
} as const;
