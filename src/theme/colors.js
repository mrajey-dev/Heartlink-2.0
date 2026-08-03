// src/theme/colors.js — Glassmorphism design tokens

export const DARK_THEME = {
  isDark: true,
  // ─── App background (gradient, visible through glass) ──────────────────────
  bgGrad:       ['#4A0E4E', '#1D052A', '#0D0214'],   // vibrant fuchsia, neon fuchsia night, dark obsidian
  bg:           '#080516',
  bgDark:       '#030206',

  // ─── Glass surfaces ─────────────────────────────────────────────────────────
  glass:        'rgba(255,255,255,0.08)',
  glassMid:     'rgba(255,255,255,0.13)',
  glassHigh:    'rgba(255,255,255,0.20)',
  glassWhite:   'rgba(255,255,255,0.28)',
  glassDark:    'rgba(0,0,0,0.40)',
  glassDarkHigh:'rgba(0,0,0,0.62)',

  // ─── Glass borders ──────────────────────────────────────────────────────────
  border:       'rgba(255,255,255,0.14)',
  borderHigh:   'rgba(255,255,255,0.28)',
  borderAccent: 'rgba(255,0,127,0.45)',

  // ─── Text ───────────────────────────────────────────────────────────────────
  textPrimary:  '#FFFFFF',
  textSec:      'rgba(255,255,255,0.65)',
  textFaint:    'rgba(255,255,255,0.40)',
  textDark:     '#0D0F1A',

  // ─── Accents ────────────────────────────────────────────────────────────────
  accent:       '#FF007F',                             // neon fuchsia
  accentSoft:   'rgba(255,0,127,0.16)',
  accentBright: '#FF4D94',
  accentGreen:  '#30D158',
  accentBlue:   '#5E5CE6',
  accentGold:   '#FFD60A',

  // ─── Gradient sets ──────────────────────────────────────────────────────────
  gradientCard:   ['rgba(0,0,0,0)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.90)'],
  gradientTop:    ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.20)', 'transparent'],
  gradientAccent: ['#FF007F', '#B5179E'],               // neon fuchsia to electric purple
  gradientBlue:   ['#5E5CE6', '#0A84FF'],
  gradientGreen:  ['#30D158', '#25A244'],
  gradientPurple: ['#BF5AF2', '#5E5CE6'],

  // Extra helper properties
  surface:      'rgba(255,255,255,0.08)',
  glassBorder:  'rgba(255,255,255,0.14)',
};

export const LIGHT_THEME = {
  isDark: false,
  // ─── App background (gradient, visible through glass) ──────────────────────
  bgGrad:       ['#F0ECFC', '#FDF0F6', '#FAFAFD'],   // soft bright lavender, warm blush, crisp paper white
  bg:           '#F0ECFC',
  bgDark:       '#E2DBF5',

  // ─── Glass surfaces ─────────────────────────────────────────────────────────
  glass:        'rgba(255, 255, 255, 0.85)',
  glassMid:     'rgba(255, 255, 255, 0.92)',
  glassHigh:    'rgba(0,0,0,0.12)',
  glassWhite:   'rgba(255,255,255,0.60)',
  glassDark:    'rgba(255,255,255,0.45)', // inverted for light glass button on top of images
  glassDarkHigh:'rgba(255,255,255,0.75)',

  // ─── Glass borders ──────────────────────────────────────────────────────────
  border:       'rgba(0,0,0,0.08)',
  borderHigh:   'rgba(0,0,0,0.15)',
  borderAccent: 'rgba(255,0,127,0.30)',

  // ─── Text ───────────────────────────────────────────────────────────────────
  textPrimary:  '#0D0F1A',
  textSec:      'rgba(13,15,26,0.65)',
  textFaint:    'rgba(13,15,26,0.40)',
  textDark:     '#FFFFFF',

  // ─── Accents ────────────────────────────────────────────────────────────────
  accent:       '#FF007F',                             // neon fuchsia
  accentSoft:   'rgba(255,0,127,0.08)',
  accentBright: '#FF4D94',
  accentGreen:  '#248A3D',
  accentBlue:   '#4A47D1',
  accentGold:   '#E5B800',

  // ─── Gradient sets ──────────────────────────────────────────────────────────
  gradientCard:   ['rgba(255,255,255,0)', 'rgba(14, 12, 12, 0.29)', 'rgba(0, 0, 0, 1)'],
  gradientTop:    ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.30)', 'transparent'],
  gradientAccent: ['#FF007F', '#B5179E'],               // neon fuchsia to electric purple
  gradientBlue:   ['#4A47D1', '#0070E0'],
  gradientGreen:  ['#248A3D', '#1A7031'],
  gradientPurple: ['#A040D9', '#4A47D1'],

  // Extra helper properties
  surface:      'rgba(0,0,0,0.04)',
  glassBorder:  'rgba(0,0,0,0.08)',
};

export const THEME = DARK_THEME;

