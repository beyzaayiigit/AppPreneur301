/**
 * Haftalık ön ayar vitrin indeksi (Original=0 hariç 1..15 döngü).
 * Backend `weekly_preset_catalog_index` ile aynı: UTC Unix zamanı / 604800 s (7 gün).
 * Her 7 günde bir değişir; tüm cihazlarda backend ile aynı sonucu verir.
 */
export function weeklyPresetCatalogIndexUtc(d = new Date()): number {
  const weeks = Math.floor(d.getTime() / 604800000);
  return 1 + (weeks % 15);
}
