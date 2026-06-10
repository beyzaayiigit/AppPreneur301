import * as FileSystem from 'expo-file-system/legacy';
import { cloneEditState, createDefaultEditState, type EditState } from '../engine/editState';

const RECIPES_FILE = `${FileSystem.documentDirectory ?? ''}lumeris_saved_recipes.json`;
const MAX_SAVED = 40;

export type SavedRecipe = {
  id: string;
  name: string;
  state: EditState;
  createdAt: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function normalizeEditState(raw: Partial<EditState> | undefined): EditState {
  const d = createDefaultEditState();
  if (!raw) return d;
  return {
    presetIndex: clamp(Math.round(raw.presetIndex ?? d.presetIndex), 0, 15),
    presetIntensity: clamp(raw.presetIntensity ?? d.presetIntensity, 0, 100),
    exposure: clamp(raw.exposure ?? d.exposure, -2, 2),
    contrast: clamp(raw.contrast ?? d.contrast, 0.5, 1.5),
    saturation: clamp(raw.saturation ?? d.saturation, 0, 2),
    temperature: clamp(raw.temperature ?? d.temperature, -1, 1),
    pop: clamp(raw.pop ?? d.pop, 0, 1),
    sharpness: clamp(raw.sharpness ?? d.sharpness, 0, 2),
    fade: clamp(raw.fade ?? d.fade, 0, 1),
    vignette: clamp(raw.vignette ?? d.vignette, 0, 1),
    grain: clamp(raw.grain ?? d.grain, 0, 1),
    selectiveSkin: clamp(raw.selectiveSkin ?? d.selectiveSkin, -1, 1),
    selectiveSky: clamp(raw.selectiveSky ?? d.selectiveSky, -1, 1),
    selectiveGreen: clamp(raw.selectiveGreen ?? d.selectiveGreen, -1, 1),
    selectiveWarm: clamp(raw.selectiveWarm ?? d.selectiveWarm, -1, 1),
  };
}

export function isDefaultEditState(state: EditState): boolean {
  const d = createDefaultEditState();
  return (Object.keys(d) as (keyof EditState)[]).every((k) => state[k] === d[k]);
}

async function readAll(): Promise<SavedRecipe[]> {
  try {
    const info = await FileSystem.getInfoAsync(RECIPES_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(RECIPES_FILE);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const o = x as Record<string, unknown>;
        return {
          id: String(o.id ?? ''),
          name: String(o.name ?? 'Görünüm').slice(0, 48),
          createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
          state: normalizeEditState(o.state as Partial<EditState>),
        } satisfies SavedRecipe;
      })
      .filter((r) => r.id.length > 0);
  } catch {
    return [];
  }
}

async function writeAll(recipes: SavedRecipe[]): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(RECIPES_FILE, JSON.stringify(recipes, null, 2));
}

export async function listSavedRecipes(): Promise<SavedRecipe[]> {
  const items = await readAll();
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addSavedRecipe(name: string, state: EditState): Promise<SavedRecipe> {
  const trimmed = name.trim().slice(0, 48) || 'Görünüm';
  const recipes = await readAll();
  if (recipes.length >= MAX_SAVED) {
    recipes.pop();
  }
  const entry: SavedRecipe = {
    id: `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    state: cloneEditState(normalizeEditState(state)),
    createdAt: Date.now(),
  };
  recipes.unshift(entry);
  await writeAll(recipes);
  return entry;
}

export async function deleteSavedRecipe(id: string): Promise<void> {
  const recipes = await readAll();
  await writeAll(recipes.filter((r) => r.id !== id));
}

export async function getSavedRecipeCount(): Promise<number> {
  return (await readAll()).length;
}
