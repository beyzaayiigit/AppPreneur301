export const HSL_LABELS = [
  'Kırmızı',
  'Turuncu',
  'Sarı',
  'Yeşil',
  'Aqua',
  'Mavi',
  'Mor',
  'Magenta',
] as const;

export type HslChannel = { h: number; s: number; l: number };

export type EditState = {
  presetIndex: number;
  presetIntensity: number;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  sharpness: number;
  fade: number;
  vignette: number;
  grain: number;
  hsl: HslChannel[];
};

export function createDefaultEditState(): EditState {
  const hsl = Array.from({ length: 8 }, () => ({ h: 0, s: 0, l: 0 }));
  return {
    presetIndex: 0,
    presetIntensity: 100,
    exposure: 0,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    sharpness: 1,
    fade: 0,
    vignette: 0,
    grain: 0.15,
    hsl,
  };
}

export function cloneEditState(s: EditState): EditState {
  return {
    ...s,
    hsl: s.hsl.map((c) => ({ ...c })),
  };
}
