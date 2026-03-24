import type { BrandVariants, Theme } from '@fluentui/react-components';
import { createDarkTheme } from '@fluentui/react-components';

// P3 AI Tools — signature neon lime accent #dbff55
// Source: LogiMind portal CSS :root tokens
const p3Brand: BrandVariants = {
  10:  '#090e00',
  20:  '#141e00',
  30:  '#212f00',
  40:  '#304400',
  50:  '#425c00',
  60:  '#587a00',
  70:  '#76a700',
  80:  '#dbff55', // primary accent — neon lime
  90:  '#e2ff6e',
  100: '#e8ff88',
  110: '#efffaa',
  120: '#f4ffc4',
  130: '#f7ffd8',
  140: '#fbffe8',
  150: '#fdfff5',
  160: '#fefffc',
};

const base = createDarkTheme(p3Brand);

// Exact tokens from LogiMind :root CSS variables
const BG        = '#00002d'; // --foundry-bg
const BG_EL     = '#0a0a3a'; // --foundry-bg-elevated
const SURFACE   = '#12124a'; // --foundry-surface
const SURF_HV   = '#1a1a5a'; // --foundry-surface-hover
const BORDER    = '#2a2a6a'; // --foundry-border
const ACCENT    = '#dbff55'; // --foundry-accent
const ACCENT_HV = '#e5ff77'; // --foundry-accent-hover
const TEXT_1    = '#fafafa'; // --text-primary
const TEXT_2    = '#a1a1aa'; // --text-secondary
const TEXT_3    = '#6a6a8a'; // --text-muted

export const p3Theme: Theme = {
  ...base,

  // ── Backgrounds ──────────────────────────────────────────────
  colorNeutralBackground1:         BG,
  colorNeutralBackground1Hover:    BG_EL,
  colorNeutralBackground1Pressed:  SURFACE,
  colorNeutralBackground1Selected: BG_EL,
  colorNeutralBackground2:         BG_EL,
  colorNeutralBackground2Hover:    SURFACE,
  colorNeutralBackground2Pressed:  SURF_HV,
  colorNeutralBackground2Selected: SURFACE,
  colorNeutralBackground3:         SURFACE,
  colorNeutralBackground3Hover:    SURF_HV,
  colorNeutralBackground3Pressed:  '#222270',
  colorNeutralBackground3Selected: SURF_HV,
  colorNeutralBackground4:         SURF_HV,
  colorNeutralBackground4Hover:    '#222270',
  colorNeutralBackground4Pressed:  '#2a2a80',
  colorNeutralBackground4Selected: '#222270',
  colorNeutralBackground5:         '#222270',
  colorNeutralBackground5Hover:    '#2a2a80',
  colorNeutralBackground5Pressed:  '#303090',
  colorNeutralBackground5Selected: '#2a2a80',
  colorNeutralBackground6:         '#2a2a80',

  colorSubtleBackground:           'transparent',
  colorSubtleBackgroundHover:      BG_EL,
  colorSubtleBackgroundPressed:    SURFACE,
  colorSubtleBackgroundSelected:   BG_EL,

  // ── Strokes / Borders ────────────────────────────────────────
  colorNeutralStroke1:             BORDER,
  colorNeutralStroke2:             '#3a3a7a',
  colorNeutralStroke3:             '#4a4a8a',
  colorNeutralStrokeAccessible:    TEXT_2,
  colorNeutralStrokeAccessibleHover:   TEXT_1,
  colorNeutralStrokeAccessiblePressed: TEXT_2,
  colorNeutralStrokeDisabled:      '#1a1a4a',

  // ── Text ─────────────────────────────────────────────────────
  colorNeutralForeground1:         TEXT_1,
  colorNeutralForeground1Hover:    TEXT_1,
  colorNeutralForeground1Pressed:  TEXT_1,
  colorNeutralForeground1Selected: TEXT_1,
  colorNeutralForeground2:         TEXT_2,
  colorNeutralForeground2Hover:    TEXT_1,
  colorNeutralForeground2Pressed:  TEXT_1,
  colorNeutralForeground2Selected: TEXT_1,
  colorNeutralForeground3:         TEXT_3,
  colorNeutralForeground3Hover:    TEXT_2,
  colorNeutralForeground3Pressed:  TEXT_2,
  colorNeutralForeground3Selected: TEXT_2,
  colorNeutralForegroundDisabled:  '#3a3a6a',

  // ── Brand / Accent ───────────────────────────────────────────
  colorBrandBackground:            ACCENT,
  colorBrandBackgroundHover:       ACCENT_HV,
  colorBrandBackgroundPressed:     '#c8f040',
  colorBrandBackgroundSelected:    ACCENT,
  colorBrandForeground1:           ACCENT,
  colorBrandForeground2:           ACCENT_HV,
  colorBrandStroke1:               ACCENT,
  colorBrandStroke2:               ACCENT_HV,

  // Text ON a lime button must be dark for readability
  colorNeutralForegroundOnBrand:   '#00002d',
  colorNeutralForeground2BrandHover:    ACCENT,
  colorNeutralForeground2BrandPressed:  '#c8f040',
  colorNeutralForeground2BrandSelected: ACCENT,

  // ── Typography — Inter (P3 AI tools standard) ────────────────
  fontFamilyBase:     "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyNumeric:  "'Inter', 'Segoe UI', sans-serif",
  fontFamilyMonospace:"'Cascadia Code', 'Courier New', monospace",

  // ── Border radius — matches LogiMind (rounded, modern) ───────
  borderRadiusSmall:  '8px',
  borderRadiusMedium: '12px',
  borderRadiusLarge:  '16px',
  borderRadiusXLarge: '20px',
};
