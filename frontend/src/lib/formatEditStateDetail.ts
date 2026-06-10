import type { AdjustKey, EditState } from '../engine/editState';
import { PRESET_NAMES } from '../engine/presets';

export type EditStateDetailLine = {
  label: string;
  value: string;
};

function formatExposure(v: number): string {
  if (v === 0) return '0.00';
  return `${v > 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}`;
}

function formatContrastUi(c: number): string {
  const x = Math.round((c - 1) * 100);
  if (x === 0) return '0';
  return `${x > 0 ? '+' : ''}${x}`;
}

function formatWarmthUi(t: number): string {
  const x = Math.round(t * 100);
  if (x === 0) return '0';
  return `${x > 0 ? '+' : '-'}${Math.abs(x)}`;
}

function formatPopUi(p: number): string {
  const x = Math.round(p * 100);
  if (x === 0) return '0';
  return `+${x}`;
}

function formatSelectiveUi(v: number): string {
  const x = Math.round(v * 100);
  if (x === 0) return '0';
  return `${x > 0 ? '+' : ''}${x}`;
}

function formatDecimalUi(v: number, maxDecimals = 2): string {
  if (!Number.isFinite(v)) return '0';
  const t = parseFloat(v.toFixed(maxDecimals));
  if (t === 0) return '0';
  if (Number.isInteger(t)) return String(t);
  return String(t);
}

const ADJUST_LINES: { key: AdjustKey; label: string; format: (v: number) => string }[] = [
  { key: 'exposure', label: 'Exposure', format: formatExposure },
  { key: 'contrast', label: 'Contrast', format: formatContrastUi },
  { key: 'pop', label: 'Pop', format: formatPopUi },
  { key: 'temperature', label: 'Warmth', format: formatWarmthUi },
  { key: 'saturation', label: 'Saturation', format: formatDecimalUi },
  { key: 'selectiveSkin', label: 'Skin', format: formatSelectiveUi },
  { key: 'selectiveSky', label: 'Sky', format: formatSelectiveUi },
  { key: 'selectiveGreen', label: 'Green', format: formatSelectiveUi },
  { key: 'selectiveWarm', label: 'Warm', format: formatSelectiveUi },
  { key: 'sharpness', label: 'Sharpness', format: formatDecimalUi },
  { key: 'grain', label: 'Grain', format: formatDecimalUi },
  { key: 'fade', label: 'Fade', format: formatDecimalUi },
  { key: 'vignette', label: 'Vignette', format: formatDecimalUi },
];

export function buildEditStateDetail(state: EditState): EditStateDetailLine[] {
  const preset = PRESET_NAMES[state.presetIndex] ?? 'Original';
  const lines: EditStateDetailLine[] = [
    { label: 'Preset', value: preset },
    {
      label: 'Intensity',
      value: state.presetIndex === 0 ? '—' : `${Math.round(state.presetIntensity)}%`,
    },
  ];
  for (const row of ADJUST_LINES) {
    lines.push({ label: row.label, value: row.format(state[row.key]) });
  }
  return lines;
}
