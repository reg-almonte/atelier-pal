import { describe, expect, it } from 'vitest';
import {
  BELT_PALETTE,
  getRelativeLuminance,
  isLightSkinTone,
  SKIN_TONES,
} from '../domain/models';

describe('Human Model Stage Domain Helpers & Constants', () => {
  it('defines the 5 studio skin tones in expected order', () => {
    expect(SKIN_TONES).toHaveLength(5);
    expect(SKIN_TONES.map((t) => [t.name, t.hex])).toEqual([
      ['Fair', '#F5D6C3'],
      ['Light Medium', '#E0B495'],
      ['Medium', '#C18C68'],
      ['Deep Brown', '#835237'],
      ['Black', '#2B2A27'],
    ]);
  });

  it('defines BELT_PALETTE starting with optional None (hex: null)', () => {
    expect(BELT_PALETTE.length).toBeGreaterThan(1);
    expect(BELT_PALETTE[0]).toEqual({ name: 'None', hex: null });
    for (const belt of BELT_PALETTE.slice(1)) {
      expect(belt.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('computes WCAG relative luminance accurately', () => {
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('classifies light vs dark skin tones around the 0.22 luminance threshold', () => {
    const [fair, lightMedium, medium, deepBrown, black] = SKIN_TONES;
    expect(isLightSkinTone(fair.hex)).toBe(true);
    expect(isLightSkinTone(lightMedium.hex)).toBe(true);
    expect(isLightSkinTone(medium.hex)).toBe(true);
    expect(isLightSkinTone(deepBrown.hex)).toBe(false);
    expect(isLightSkinTone(black.hex)).toBe(false);
  });
});
