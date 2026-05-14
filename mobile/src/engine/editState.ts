export type EditState = {
  presetIndex: number;
  presetIntensity: number;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  /** Ek “punch” — mockup’taki Pop; preset + temel renkten sonra hafif kontrast artışı */
  pop: number;
  sharpness: number;
  fade: number;
  vignette: number;
  grain: number;
  selectiveSkin: number;
  selectiveSky: number;
  selectiveGreen: number;
  selectiveWarm: number;
};

export type AdjustKey = Exclude<keyof EditState, 'presetIndex' | 'presetIntensity'>;

export function createDefaultEditState(): EditState {
  return {
    presetIndex: 0,
    presetIntensity: 100,
    exposure: 0,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    pop: 0,
    sharpness: 1,
    fade: 0,
    vignette: 0,
    grain: 0,
    selectiveSkin: 0,
    selectiveSky: 0,
    selectiveGreen: 0,
    selectiveWarm: 0,
  };
}

export function cloneEditState(s: EditState): EditState {
  return { ...s };
}

