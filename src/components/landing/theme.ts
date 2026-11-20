/**
 * DuoSync Landing Page Unified Theme System
 *
 * Ring colors strictly matched with the in-app health vitals:
 * Steps: Emerald (#10B981)
 * Weight: Rose (#F43F5E)
 * Sleep: Indigo (#818CF8)
 * Water: Sky (#38BDF8)
 */

export const THEME = {
  // Base Surface & Typography (Monochromatic Minimal Base)
  bg: '#000000',
  surface: '#0A0A0F',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  text: '#F5F5F7',
  textDim: 'rgba(245, 245, 247, 0.6)',
  textFaint: 'rgba(245, 245, 247, 0.15)',

  // Partner Accents (Minimal Clean Palette)
  partnerA: '#F43F5E', // Rose
  partnerB: '#38BDF8', // Sky

  // Concentric Rings: Matched with in-app health dashboard
  rings: {
    steps: {
      name: 'Steps',
      base: '#10B981',
      tint: '#34D399',
      targetPct: 84,
      targetValue: '10,480',
      unit: 'steps',
    },
    weight: {
      name: 'Weight',
      base: '#F43F5E',
      tint: '#FB7185',
      targetPct: 92,
      targetValue: '62.4',
      unit: 'kg',
    },
    sleep: {
      name: 'Sleep',
      base: '#818CF8',
      tint: '#A5B4FC',
      targetPct: 88,
      targetValue: '7h 45m',
      unit: 'sleep',
    },
    water: {
      name: 'Water',
      base: '#38BDF8',
      tint: '#7DD3FC',
      targetPct: 76,
      targetValue: '2.4',
      unit: 'L',
    },
  },
} as const;

export type ThemeType = typeof THEME;
