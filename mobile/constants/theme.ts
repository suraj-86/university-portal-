// One palette for the whole app. Screens never hard-code colours: they read them from useAppTheme().
const light = {
  mode: 'light' as 'light' | 'dark',
  bg: '#eaf6f8',
  surface: '#fbfdfd',
  surfaceAlt: '#dfeef2',
  border: '#d0e4e9',
  text: '#0f1b3d',
  muted: '#5b6b8c',
  faint: '#8a98b5',
  primary: '#2563eb',
  primaryText: '#ffffff',
  primarySoft: '#dbeafe',
  accent: '#0e7490',
  accentSoft: '#cffafe',
  header: '#d5f3fb',
  headerText: '#083344',
  success: '#059669',
  successSoft: '#d1fae5',
  warn: '#d97706',
  warnSoft: '#fef3c7',
  danger: '#e11d48',
  dangerSoft: '#ffe4e6',
  chart: '#2563eb',
  chartSoft: '#93c5fd',
  chartAlt: '#94a3b8',
  shadow: '#0f1b3d',
};

export type Palette = typeof light;

const dark: Palette = {
  mode: 'dark',
  bg: '#08101f',
  surface: '#0f1a33',
  surfaceAlt: '#16264a',
  border: '#22365f',
  text: '#e8eefb',
  muted: '#8191b4',
  faint: '#6b7ca3',
  primary: '#3b82f6',
  primaryText: '#ffffff',
  primarySoft: '#172a54',
  accent: '#22d3ee',
  accentSoft: '#0c3a4a',
  header: '#0a2230',
  headerText: '#e6fbff',
  success: '#34d399',
  successSoft: '#0b3a2c',
  warn: '#fbbf24',
  warnSoft: '#3d2f0a',
  danger: '#fb7185',
  dangerSoft: '#4a1424',
  chart: '#60a5fa',
  chartSoft: '#1e3a8a',
  chartAlt: '#64748b',
  shadow: '#000000',
};

export const palettes = { light, dark };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const BRAND = {
  name: 'BABASAHEB BHIMRAO AMBEDKAR UNIVERSITY',
  sub: '(A Central University)',
  campus: 'SATELLITE CAMPUS AMETHI',
  short: 'BBAU Amethi',
};
