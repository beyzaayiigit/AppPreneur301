/** Original (0) hariç haftalık vitrinde dönen ön ayar sayısı. */
export const WEEKLY_PRESET_COUNT = 15;

const MS_PER_WEEK = 604800000;

/**
 * Haftalık vitrin meta verisi.
 * Backend `weekly_preset_catalog_index` ile aynı: UTC Unix / 604800 s (7 gün).
 */
export function weeklySpotlightMeta(d = new Date()) {
  const weeks = Math.floor(d.getTime() / MS_PER_WEEK);
  const slot = weeks % WEEKLY_PRESET_COUNT;
  return {
    presetIndex: 1 + slot,
    slotOneBased: slot + 1,
    total: WEEKLY_PRESET_COUNT,
  };
}

export function weeklyPresetCatalogIndexUtc(d = new Date()): number {
  return weeklySpotlightMeta(d).presetIndex;
}
