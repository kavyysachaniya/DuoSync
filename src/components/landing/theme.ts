/**
 * DuoSync Landing Page Unified Theme System
 *
 * Strict Rule: Only these tokens are used across the landing experience.
 * No hardcoded arbitrary colors, green, teal, mint, or off-palette blues.
 */

export const THEME = {
  // Base Surface & Typography
  bg: '#07070A',
  surface: '#0E0E13',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  text: '#F5F5F7',
  textDim: 'rgba(245, 245, 247, 0.6)',
  textFaint: 'rgba(245, 245, 247, 0.15)',

  // Partner A (Warm)
  rose: '#FF5C8A',
  amber: '#FFB86B',

  // Partner B (Cool)
  sky: '#5CB8FF',
  violet: '#8B7CFF',

  // Concentric Rings: Base + Lighter Tint Gradients
  rings: {
    steps: {
      name: 'Steps',
      base: '#FF5C8A',
      tint: '#FFA6BF',
      targetPct: 84,
      targetValue: '10,480',
      unit: 'steps',
    },
    weight: {
      name: 'Weight',
      base: '#FFB86B',
      tint: '#FFD7A8',
      targetPct: 92,
      targetValue: '62.4',
      unit: 'kg',
    },
    water: {
      name: 'Water',
      base: '#5CB8FF',
      tint: '#A3D7FF',
      targetPct: 76,
      targetValue: '2.4',
      unit: 'L',
    },
    sleep: {
      name: 'Sleep',
      base: '#8B7CFF',
      tint: '#BCB3FF',
      targetPct: 88,
      targetValue: '7h 45m',
      unit: 'sleep',
    },
  },

  // Primary Gradient Preset
  primaryGradient: 'linear-gradient(135deg, #FF5C8A 0%, #FFB86B 100%)',
  partnerAGradient: 'linear-gradient(135deg, #FF5C8A 0%, #FFB86B 100%)',
  partnerBGradient: 'linear-gradient(135deg, #5CB8FF 0%, #8B7CFF 100%)',
} as const;

export type ThemeType = typeof THEME;
