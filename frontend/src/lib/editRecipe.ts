import type { EditState } from '../engine/editState';

/** API snake_case edit recipe from /api/v1/suggest-styles */
export type ApiEditRecipe = {
  preset_index: number;
  preset_intensity: number;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  pop: number;
  sharpness: number;
  fade: number;
  vignette: number;
  grain: number;
  selective_skin: number;
  selective_sky: number;
  selective_green: number;
  selective_warm: number;
};

export type StyleDirection = {
  id: string;
  label: string;
  tagline: string;
  coach_tip?: string;
  edit: ApiEditRecipe;
};

export type SuggestStylesResponse = {
  directions: StyleDirection[];
  reasoning_tr: string;
  source: 'gemini' | 'fallback' | string;
};

export function apiEditToEditState(edit: ApiEditRecipe): EditState {
  return {
    presetIndex: edit.preset_index,
    presetIntensity: edit.preset_intensity,
    exposure: edit.exposure,
    contrast: edit.contrast,
    saturation: edit.saturation,
    temperature: edit.temperature,
    pop: edit.pop,
    sharpness: edit.sharpness,
    fade: edit.fade,
    vignette: edit.vignette,
    grain: edit.grain,
    selectiveSkin: edit.selective_skin,
    selectiveSky: edit.selective_sky,
    selectiveGreen: edit.selective_green,
    selectiveWarm: edit.selective_warm,
  };
}

/** AI önerisini baseline ile karıştırır; intensity 0 = baseline, 100 = tam öneri. */
export function blendEditState(base: EditState, target: EditState, intensityPct: number): EditState {
  const t = Math.max(0, Math.min(100, intensityPct)) / 100;
  if (t <= 0) return { ...base };
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const samePreset = base.presetIndex === target.presetIndex;
  const presetIntensity = samePreset
    ? lerp(base.presetIntensity, target.presetIntensity)
    : lerp(0, target.presetIntensity);
  return {
    presetIndex: target.presetIndex,
    presetIntensity,
    exposure: lerp(base.exposure, target.exposure),
    contrast: lerp(base.contrast, target.contrast),
    saturation: lerp(base.saturation, target.saturation),
    temperature: lerp(base.temperature, target.temperature),
    pop: lerp(base.pop, target.pop),
    sharpness: lerp(base.sharpness, target.sharpness),
    fade: lerp(base.fade, target.fade),
    vignette: lerp(base.vignette, target.vignette),
    grain: lerp(base.grain, target.grain),
    selectiveSkin: lerp(base.selectiveSkin, target.selectiveSkin),
    selectiveSky: lerp(base.selectiveSky, target.selectiveSky),
    selectiveGreen: lerp(base.selectiveGreen, target.selectiveGreen),
    selectiveWarm: lerp(base.selectiveWarm, target.selectiveWarm),
  };
}
