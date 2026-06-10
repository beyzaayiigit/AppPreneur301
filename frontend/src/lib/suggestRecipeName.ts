import type { EditState } from '../engine/editState';
import { PRESET_NAMES } from '../engine/presets';

export function suggestRecipeName(state: EditState): string {
  const preset = PRESET_NAMES[state.presetIndex] ?? 'Görünüm';
  const date = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${preset} · ${date}`;
}
