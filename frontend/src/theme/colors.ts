/** Açık tema — eski ekranlar / bileşen geriye dönük uyum için */
export const theme = {
  lilac: '#E6E6FA',
  lilacDeep: '#C4B5E8',
  softGray: '#F4F2F8',
  text: '#2D2640',
  textMuted: '#6B6280',
  surface: '#FFFFFF',
  border: '#D8D2E8',
} as const;

/**
 * Deep Moss — DESIGN.md + deep_moss_design_system_detail.md
 * Kaynak: surface-low #0E1511, surface-lowest #09100C, primary sand #E3D5CA,
 * primary-container #3E4B43, accent-organic #84A59D, border #3A4D39.
 * `accent` / `onAccent` geriye dönük alias (eski importlar kırılmasın).
 */
export const dark = {
  bg: '#0e1511',
  canvas: '#09100c',
  bgElevated: '#161d19',
  surface: '#1a211d',
  surfaceMuted: '#242c27',
  surfaceBright: '#333b36',
  border: '#3a4d39',
  /** Kart / sheet — shadcn-benzeri sert 1px kutu hissini yumuşatır */
  borderSubtle: 'rgba(58, 77, 57, 0.22)',
  /** İnce ayırıcılar (üst çizgi, divider) */
  divider: 'rgba(58, 77, 57, 0.14)',
  outline: '#988f88',
  text: '#f2e9e4',
  textMuted: '#a8b5ad',
  textDim: '#7a8a82',
  textDisabled: '#525e57',
  primary: '#e3d5ca',
  onPrimary: '#0b120e',
  primaryContainer: '#3e4b43',
  onPrimaryContainer: '#d1e5d8',
  accentOrganic: '#84a59d',
  /** @deprecated primary / accentOrganic kullanın */
  accent: '#84a59d',
  accentMuted: '#5c6e66',
  /** @deprecated onPrimary veya onPrimaryContainer */
  onAccent: '#0b120e',
  accentGlow: 'rgba(227, 213, 202, 0.28)',
  overlay: 'rgba(9, 16, 12, 0.72)',
  silver: '#a8b5ad',
  graphite: '#525e57',
} as const;
