/** 20 Skia ColorMatrix katsayısı (satır majör 4×5). .cube LUT ile değiştirilebilir. */

/** Küçük önizleme etiketi (mockup’taki kısa kod hissi) */
export const PRESET_SHORT_LABELS = [
  'ORG',
  'NEG',
  'WARM',
  'COOL',
  '70S',
  'B&W',
  'GOLD',
  'WOOD',
  'PAST',
  'LOW',
  'NEON',
  'SAND',
  'VINT',
  'BLUE',
  'PINK',
  'MATT',
] as const;

export const PRESET_NAMES = [
  'Original',
  'Klasik Neg',
  'Sıcak Portre',
  'Soğuk Gölge',
  'Soluk 70ler',
  'Kontrast B&W',
  'Altın Saat',
  'Orman Yeşili',
  'Pastel Rüya',
  'Düşük Doygun',
  'Neon Gece',
  'Kum Sahil',
  'Vintage Solma',
  'Derin Mavi',
  'Yumuşak Pembe',
  'Mat Film',
] as const;

const I = (): number[] => [
  1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0,
];

function scaleR(r: number, g: number, b: number, rb = 0, gb = 0, bb = 0): number[] {
  return [r, 0, 0, 0, rb, 0, g, 0, 0, gb, 0, 0, b, 0, bb, 0, 0, 0, 1, 0];
}

function mixMatrices(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v * (1 - t) + b[i] * t);
}

/** 1’den sapmayı büyütür — %100 yoğunlukta look’lar belirgin olsun (çok hafif matrislerden kaçınır). */
function amp(v: number, k = 1.62): number {
  const x = 1 + (v - 1) * k;
  return Math.max(0.2, Math.min(2.1, x));
}

/** Küçük renk ofseti / çapraz terim (≈0.01–0.15) — abartmadan güçlendirir */
function lift(v: number, k = 1.55): number {
  const s = Math.sign(v) * Math.min(0.22, Math.abs(v) * k);
  return s;
}

const RAW_PRESETS: number[][] = [
  mixMatrices(I(), scaleR(amp(1.02), amp(0.99), amp(0.97), 0, 0, 0), 1),
  mixMatrices(I(), scaleR(amp(1.06), amp(0.98), amp(0.92), lift(0.02), 0, 0), 1),
  mixMatrices(I(), scaleR(amp(0.94), amp(0.98), amp(1.08), 0, 0, lift(0.02)), 1),
  [1, 0, 0, 0, 0.07, 0, 1, 0, 0, 0.07, 0, 0, 1, 0, 0.07, 0, 0, 0, 1, 0],
  [0.28, 0.64, 0.08, 0, 0, 0.28, 0.64, 0.08, 0, 0, 0.28, 0.64, 0.08, 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(amp(1.12), amp(1.04), amp(0.9), lift(0.03), lift(0.01), 0), 1),
  mixMatrices(I(), scaleR(amp(0.92), amp(1.08), amp(0.95), 0, lift(0.02), 0), 1),
  [amp(1.05), 0.03, 0.03, 0, 0, 0.03, amp(1.02), 0.03, 0, 0, 0.03, 0.03, amp(1.08), 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(amp(1.02), amp(1.02), amp(1.02), 0, 0, 0), 0.94),
  [amp(1.15), 0, lift(0.05), 0, 0, 0, amp(1.05), lift(0.12), 0, 0, lift(0.05), 0, amp(1.2), 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(amp(1.05), amp(1.02), amp(0.94), lift(0.02), lift(0.02), lift(0.02)), 1),
  [amp(0.95), 0, 0, 0, 0.095, 0, amp(0.93), 0, 0, 0.095, 0, 0, amp(0.98), 0, 0.095, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(amp(0.9), amp(0.96), amp(1.12), 0, 0, lift(0.03)), 1),
  [amp(1.08), lift(0.04), lift(0.06), 0, 0, lift(0.02), amp(1.02), lift(0.04), 0, 0, lift(0.04), lift(0.02), amp(1.06), 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(amp(0.96), amp(0.97), amp(0.98), lift(0.03), lift(0.03), lift(0.03)), 1),
];

export function presetThumbBackground(index: number): string {
  if (index === 0) return 'hsl(260, 8%, 22%)';
  const h = ((index - 1) * 47) % 360;
  return `hsl(${h}, 38%, 24%)`;
}

export function getPresetMatrix(index: number, intensity01: number): number[] {
  const id = I();
  if (index === 0) return id;

  const presetIdx = index - 1;
  const i = Math.max(0, Math.min(RAW_PRESETS.length - 1, presetIdx));
  const t = Math.max(0, Math.min(1, intensity01));
  return mixMatrices(id, RAW_PRESETS[i], t);
}
