/** 20 Skia ColorMatrix katsayısı (satır majör 4×5). .cube LUT ile değiştirilebilir. */

export const PRESET_NAMES = [
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

const RAW_PRESETS: number[][] = [
  mixMatrices(I(), scaleR(1.02, 0.99, 0.97, 0, 0, 0), 1),
  mixMatrices(I(), scaleR(1.06, 0.98, 0.92, 0.02, 0, 0), 1),
  mixMatrices(I(), scaleR(0.94, 0.98, 1.08, 0, 0, 0.02), 1),
  [1, 0, 0, 0, 0.04, 0, 1, 0, 0, 0.04, 0, 0, 1, 0, 0.04, 0, 0, 0, 1, 0],
  [0.33, 0.59, 0.11, 0, 0, 0.33, 0.59, 0.11, 0, 0, 0.33, 0.59, 0.11, 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(1.12, 1.04, 0.9, 0.03, 0.01, 0), 1),
  mixMatrices(I(), scaleR(0.92, 1.08, 0.95, 0, 0.02, 0), 1),
  [1.05, 0.02, 0.02, 0, 0, 0.02, 1.02, 0.02, 0, 0, 0.02, 0.02, 1.08, 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(1.02, 1.02, 1.02, 0, 0, 0), 0.85),
  [1.15, 0, 0.05, 0, 0, 0, 1.05, 0.12, 0, 0, 0.05, 0, 1.2, 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(1.05, 1.02, 0.94, 0.02, 0.02, 0), 1),
  [0.95, 0, 0, 0, 0.06, 0, 0.93, 0, 0, 0.06, 0, 0, 0.98, 0, 0.06, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(0.9, 0.96, 1.12, 0, 0, 0.03), 1),
  [1.08, 0.04, 0.06, 0, 0, 0.02, 1.02, 0.04, 0, 0, 0.04, 0.02, 1.06, 0, 0, 0, 0, 0, 1, 0],
  mixMatrices(I(), scaleR(0.96, 0.97, 0.98, 0.03, 0.03, 0.03), 1),
];

export function getPresetMatrix(index: number, intensity01: number): number[] {
  const id = I();
  const i = Math.max(0, Math.min(RAW_PRESETS.length - 1, index));
  const t = Math.max(0, Math.min(1, intensity01));
  return mixMatrices(id, RAW_PRESETS[i], t);
}
